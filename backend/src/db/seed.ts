import pool from './connection';

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

    // 1. Create a restaurant
    const restaurantResult = await pool.query(
      `INSERT INTO restaurants (name, tax_rate, currency) 
       VALUES ('Demo Restaurant DR', 0.18, 'DOP') 
       RETURNING id`
    );
    const restaurantId = restaurantResult.rows[0].id;
    console.log(`✅ Created restaurant with ID: ${restaurantId}`);

    // 2. Create tables
    const tableNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const num of tableNumbers) {
      await pool.query(
        `INSERT INTO tables (restaurant_id, table_number, seats, status)
         VALUES ($1, $2, $3, 'available')`,
        [restaurantId, num, num <= 2 ? 2 : 4]
      );
    }
    console.log(`✅ Created ${tableNumbers.length} tables`);

    // 3. Create menu items
    const menuItems = [
      { name: 'Tostones', category: 'appetizer', price: 150.00, description: 'Fried green plantains' },
      { name: 'Yuca Frita', category: 'appetizer', price: 120.00, description: 'Fried cassava with garlic sauce' },
      { name: 'Empanadas', category: 'appetizer', price: 100.00, description: 'Beef or chicken turnovers' },
      { name: 'La Bandera', category: 'main', price: 350.00, description: 'Rice, beans, meat, and salad' },
      { name: 'Pollo Guisado', category: 'main', price: 280.00, description: 'Dominican stewed chicken' },
      { name: 'Pescado Frito', category: 'main', price: 450.00, description: 'Whole fried fish' },
      { name: 'Sancocho', category: 'main', price: 400.00, description: 'Dominican meat and root vegetable stew' },
      { name: 'Mofongo', category: 'main', price: 380.00, description: 'Mashed plantains with pork or shrimp' },
      { name: 'Tres Leches', category: 'dessert', price: 180.00, description: 'Three milk cake' },
      { name: 'Flan', category: 'dessert', price: 150.00, description: 'Caramel custard' },
      { name: 'Habichuelas con Dulce', category: 'dessert', price: 120.00, description: 'Sweet cream of beans' },
      { name: 'Presidente', category: 'beverage', price: 120.00, description: 'Dominican beer' },
      { name: 'Morir Soñando', category: 'beverage', price: 100.00, description: 'Orange and milk drink' },
      { name: 'Limonada Natural', category: 'beverage', price: 80.00, description: 'Fresh lemonade' },
      { name: 'Jugo de Chinola', category: 'beverage', price: 90.00, description: 'Passion fruit juice' },
    ];

    for (const item of menuItems) {
      await pool.query(
        `INSERT INTO menu_items (restaurant_id, name, category, price, description, available)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [restaurantId, item.name, item.category, item.price, item.description]
      );
    }
    console.log(`✅ Created ${menuItems.length} menu items`);

    console.log('\n✅ Database seeded successfully!\n');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await pool.end();
    process.exit(1);
  }
}

seedDatabase();
