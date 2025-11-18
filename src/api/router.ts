import * as express from 'express';
import * as cors from 'cors';
import * as admin from 'firebase-admin';
import { Table, Bill, MenuItem, Restaurant, OrderItem } from '../types';
import { calculateBillTotals } from '../utils/calculations';

const router = express.Router();
router.use(cors({ origin: true }));
router.use(express.json());

const db = admin.firestore();

// Helper to get restaurant
async function getRestaurant(): Promise<{ id: string; data: Restaurant }> {
  const restaurantsSnapshot = await db.collection('restaurants').limit(1).get();
  if (restaurantsSnapshot.empty) {
    throw new Error('No restaurant found');
  }
  const doc = restaurantsSnapshot.docs[0];
  return {
    id: doc.id,
    data: { id: doc.id, ...doc.data() } as Restaurant,
  };
}

// GET /api/tables - List all tables
router.get('/tables', async (req, res) => {
  try {
    const restaurant = await getRestaurant();
    const tablesSnapshot = await db
      .collection('restaurants')
      .doc(restaurant.id)
      .collection('tables')
      .orderBy('tableNumber')
      .get();

    const tables: Table[] = [];
    tablesSnapshot.forEach((doc) => {
      tables.push({ id: doc.id, ...doc.data() } as Table);
    });

    return res.status(200).json({ tables });
  } catch (error: any) {
    console.error('Error fetching tables:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/tables/:tableId/bill - Get current bill for a table
router.get('/tables/:tableId/bill', async (req, res) => {
  try {
    const { tableId } = req.params;
    const restaurant = await getRestaurant();

    // Get table
    const tableDoc = await db
      .collection('restaurants')
      .doc(restaurant.id)
      .collection('tables')
      .doc(tableId)
      .get();

    if (!tableDoc.exists) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const tableData = tableDoc.data() as Table;
    
    if (!tableData.currentBillId) {
      return res.status(200).json({ bill: null });
    }

    // Get bill
    const billDoc = await db.collection('bills').doc(tableData.currentBillId).get();
    
    if (!billDoc.exists) {
      return res.status(200).json({ bill: null });
    }

    const bill = { id: billDoc.id, ...billDoc.data() };
    return res.status(200).json({ bill });
  } catch (error: any) {
    console.error('Error fetching table bill:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/bills - Create new bill for a table
router.post('/bills', async (req, res) => {
  try {
    const { tableId, tableNumber } = req.body;

    if (!tableId || !tableNumber) {
      return res.status(400).json({ error: 'tableId and tableNumber are required' });
    }

    const restaurant = await getRestaurant();

    // Check if table already has an open bill
    const tableDoc = await db
      .collection('restaurants')
      .doc(restaurant.id)
      .collection('tables')
      .doc(tableId)
      .get();

    if (!tableDoc.exists) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const tableData = tableDoc.data();
    if (tableData?.currentBillId) {
      // Check if bill is still open
      const existingBillDoc = await db.collection('bills').doc(tableData.currentBillId).get();
      if (existingBillDoc.exists) {
        const existingBill = existingBillDoc.data();
        if (existingBill?.status === 'open') {
          return res.status(400).json({ error: 'Table already has an open bill' });
        }
      }
    }

    // Create new bill
    const now = admin.firestore.Timestamp.now();
    const newBill: Omit<Bill, 'id'> = {
      restaurantId: restaurant.id,
      tableId,
      tableNumber,
      status: 'open',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      createdAt: now,
      updatedAt: now,
    };

    const billRef = await db.collection('bills').add(newBill);

    // Update table status and currentBillId
    await db
      .collection('restaurants')
      .doc(restaurant.id)
      .collection('tables')
      .doc(tableId)
      .update({
        status: 'occupied',
        currentBillId: billRef.id,
      });

    return res.status(200).json({
      billId: billRef.id,
      message: 'Bill created successfully',
    });
  } catch (error: any) {
    console.error('Error creating bill:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/bills/:billId/items - Add items to a bill
router.post('/bills/:billId/items', async (req, res) => {
  try {
    const { billId } = req.params;
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const restaurant = await getRestaurant();

    // Get bill
    const billDoc = await db.collection('bills').doc(billId).get();
    if (!billDoc.exists) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const billData = billDoc.data() as Bill;
    if (billData.status !== 'open') {
      return res.status(400).json({ error: 'Cannot add items to a paid or cancelled bill' });
    }

    // Get menu items
    const menuItemsSnapshot = await db
      .collection('restaurants')
      .doc(restaurant.id)
      .collection('menuItems')
      .get();

    const menuItemsMap = new Map();
    menuItemsSnapshot.forEach((doc) => {
      menuItemsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    // Process new items
    const newOrderItems: OrderItem[] = [];
    for (const item of items) {
      const menuItem = menuItemsMap.get(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ error: `Menu item ${item.menuItemId} not found` });
      }
      if (!menuItem.available) {
        return res.status(400).json({ error: `Menu item ${menuItem.name} is not available` });
      }

      newOrderItems.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity || 1,
        notes: item.notes,
      });
    }

    // Add to existing items
    const updatedItems = [...billData.items, ...newOrderItems];

    // Recalculate totals
    const totals = calculateBillTotals(updatedItems, restaurant.data.taxRate);

    // Update bill
    const updatedBill = {
      ...billData,
      items: updatedItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('bills').doc(billId).update(updatedBill);

    return res.status(200).json({ bill: { id: billId, ...updatedBill } });
  } catch (error: any) {
    console.error('Error adding items to bill:', error);
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/bills/:billId/items/:itemIndex - Remove item from bill
router.delete('/bills/:billId/items/:itemIndex', async (req, res) => {
  try {
    const { billId, itemIndex } = req.params;
    const index = parseInt(itemIndex, 10);

    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid item index' });
    }

    const restaurant = await getRestaurant();

    // Get bill
    const billDoc = await db.collection('bills').doc(billId).get();
    if (!billDoc.exists) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const billData = billDoc.data() as Bill;
    if (billData.status !== 'open') {
      return res.status(400).json({ error: 'Cannot remove items from a paid or cancelled bill' });
    }

    if (index < 0 || index >= billData.items.length) {
      return res.status(400).json({ error: 'Invalid item index' });
    }

    // Remove item
    const updatedItems = billData.items.filter((_, i) => i !== index);

    // Recalculate totals
    const totals = calculateBillTotals(updatedItems, restaurant.data.taxRate);

    // Update bill
    const updatedBill = {
      ...billData,
      items: updatedItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('bills').doc(billId).update(updatedBill);

    return res.status(200).json({ bill: { id: billId, ...updatedBill } });
  } catch (error: any) {
    console.error('Error removing item from bill:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/bills/:billId/mark-paid - Mark bill as paid
router.post('/bills/:billId/mark-paid', async (req, res) => {
  try {
    const { billId } = req.params;
    const { paymentMethod } = req.body;
    
    if (!paymentMethod || !['cash', 'card', 'external'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Valid paymentMethod is required (cash, card, or external)' });
    }

    const restaurant = await getRestaurant();

    // Get bill
    const billDoc = await db.collection('bills').doc(billId).get();
    if (!billDoc.exists) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const billData = billDoc.data() as Bill;
    if (billData.status !== 'open') {
      return res.status(400).json({ error: 'Bill is not open' });
    }

    if (billData.items.length === 0) {
      return res.status(400).json({ error: 'Cannot mark an empty bill as paid' });
    }

    const now = admin.firestore.Timestamp.now();

    // Update bill
    const updatedBill = {
      ...billData,
      status: 'paid' as const,
      paymentMethod,
      paidAt: now,
      updatedAt: now,
    };

    await db.collection('bills').doc(billId).update(updatedBill);

    // Update table status to available
    await db
      .collection('restaurants')
      .doc(restaurant.id)
      .collection('tables')
      .doc(billData.tableId)
      .update({
        status: 'available',
        currentBillId: admin.firestore.FieldValue.delete(),
      });

    return res.status(200).json({ bill: { id: billId, ...updatedBill } });
  } catch (error: any) {
    console.error('Error marking bill as paid:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/menu - Get all menu items
router.get('/menu', async (req, res) => {
  try {
    const restaurant = await getRestaurant();
    const menuItemsSnapshot = await db
      .collection('restaurants')
      .doc(restaurant.id)
      .collection('menuItems')
      .orderBy('category')
      .orderBy('name')
      .get();

    const items: MenuItem[] = [];
    menuItemsSnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as MenuItem);
    });

    return res.status(200).json({ items });
  } catch (error: any) {
    console.error('Error fetching menu:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/menu - Add menu item (admin only)
router.post('/menu', async (req, res) => {
  try {
    const { name, category, price, description } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'name, category, and price are required' });
    }

    const validCategories = ['appetizer', 'main', 'dessert', 'beverage', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'price must be a positive number' });
    }

    const restaurant = await getRestaurant();

    const newMenuItem: Omit<MenuItem, 'id'> = {
      restaurantId: restaurant.id,
      name,
      category: category as MenuItem['category'],
      price,
      description,
      available: true,
      createdAt: admin.firestore.Timestamp.now(),
    };

    const menuItemRef = await db
      .collection('restaurants')
      .doc(restaurant.id)
      .collection('menuItems')
      .add(newMenuItem);

    return res.status(200).json({
      itemId: menuItemRef.id,
      message: 'Menu item created',
    });
  } catch (error: any) {
    console.error('Error creating menu item:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;

