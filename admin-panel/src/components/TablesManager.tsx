import { useState, useEffect } from 'react';
import apiClient from '../api/client';

interface Table {
  id: number;
  table_number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved';
  current_bill_id?: number;
}

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number | string;
  description?: string;
  available: boolean;
}

interface BillItem {
  id: number;
  menu_item_id: number;
  name: string;
  price: number | string;
  quantity: number;
  notes?: string;
}

interface Bill {
  id: number;
  table_number: number;
  status: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  items?: BillItem[];
}

const formatPrice = (price: number | string | undefined): string => {
  if (price === undefined || price === null) return '0.00';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
};

function TablesManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [currentBill, setCurrentBill] = useState<Bill | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({
    tableNumber: '',
    seats: '4',
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchTables();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableBill(selectedTable.id);
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    try {
      const response = await apiClient.get('/tables');
      setTables(response.data.tables);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await apiClient.get('/menu');
      setMenuItems(response.data.items.filter((item: MenuItem) => item.available));
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const fetchTableBill = async (tableId: number) => {
    try {
      const response = await apiClient.get(`/tables/${tableId}/bill`);
      setCurrentBill(response.data.bill);
    } catch (error) {
      console.error('Error fetching table bill:', error);
      setCurrentBill(null);
    }
  };

  const handleOpenTable = async (table: Table) => {
    setSelectedTable(table);
    await fetchTableBill(table.id);
    setShowOrderModal(true);
  };

  const handleCreateBill = async () => {
    if (!selectedTable) return;

    try {
      await apiClient.post('/bills', {
        tableId: selectedTable.id,
        tableNumber: selectedTable.table_number,
      });
      await fetchTableBill(selectedTable.id);
      await fetchTables(); // Refresh table status
    } catch (error: any) {
      console.error('Error creating bill:', error);
      alert(error.response?.data?.error || 'Error creating bill');
    }
  };

  const handleAddItem = async (menuItem: MenuItem) => {
    if (!selectedTable || !currentBill) {
      alert('Please create a bill first');
      return;
    }

    const quantity = quantities[menuItem.id] || 1;

    try {
      await apiClient.post(`/bills/${currentBill.id}/items`, {
        items: [{
          menuItemId: menuItem.id,
          quantity: quantity,
          notes: '',
        }],
      });
      
      await fetchTableBill(selectedTable.id);
      setQuantities({ ...quantities, [menuItem.id]: 1 });
    } catch (error: any) {
      console.error('Error adding item:', error);
      alert(error.response?.data?.error || 'Error adding item to bill');
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedTable || !currentBill) return;

    const paymentMethod = prompt('Select payment method:\n1. Cash\n2. Card\n3. External\n\nEnter 1, 2, or 3:');
    const methods: Record<string, 'cash' | 'card' | 'external'> = {
      '1': 'cash',
      '2': 'card',
      '3': 'external',
    };

    if (!paymentMethod || !methods[paymentMethod]) {
      return;
    }

    try {
      await apiClient.post(`/bills/${currentBill.id}/mark-paid`, {
        paymentMethod: methods[paymentMethod],
      });
      
      alert('Bill marked as paid!');
      setShowOrderModal(false);
      setSelectedTable(null);
      setCurrentBill(null);
      await fetchTables();
    } catch (error: any) {
      console.error('Error marking bill as paid:', error);
      alert(error.response?.data?.error || 'Error marking bill as paid');
    }
  };

  const handleSubmitTable = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTable) {
        await apiClient.put(`/tables/${editingTable.id}`, {
          tableNumber: parseInt(formData.tableNumber),
          seats: parseInt(formData.seats),
        });
      } else {
        await apiClient.post('/tables', {
          tableNumber: parseInt(formData.tableNumber),
          seats: parseInt(formData.seats),
        });
      }
      
      fetchTables();
      closeTableModal();
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Error saving table');
    }
  };

  const handleDeleteTable = async (id: number) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    
    try {
      await apiClient.delete(`/tables/${id}`);
      fetchTables();
    } catch (error: any) {
      console.error('Error deleting table:', error);
      alert(error.response?.data?.error || 'Error deleting table');
    }
  };

  const openTableModal = (table?: Table) => {
    if (table) {
      setEditingTable(table);
      setFormData({
        tableNumber: table.table_number.toString(),
        seats: table.seats.toString(),
      });
    } else {
      setEditingTable(null);
      setFormData({
        tableNumber: '',
        seats: '4',
      });
    }
    setShowTableModal(true);
  };

  const closeTableModal = () => {
    setShowTableModal(false);
    setEditingTable(null);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedTable(null);
    setCurrentBill(null);
    setQuantities({});
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      available: 'badge-success',
      occupied: 'badge-warning',
      reserved: 'badge-info',
    };
    return badges[status] || 'badge-secondary';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: '#48bb78',
      occupied: '#ed8936',
      reserved: '#4299e1',
    };
    return colors[status] || '#a0aec0';
  };

  const filteredMenuItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  const categories = ['all', ...new Set(menuItems.map(item => item.category))];

  if (loading) return <div className="loading">Loading tables...</div>;

  return (
    <div>
      <div className="section-header">
        <h2>POS - Tables & Orders</h2>
        <button className="btn btn-primary" onClick={() => openTableModal()}>
          + Add Table
        </button>
      </div>

      {/* POS Table Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {tables.map((table) => (
          <div
            key={table.id}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              position: 'relative',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: `3px solid ${getStatusColor(table.status)}`,
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            {/* Edit/Delete buttons */}
            <div style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              display: 'flex',
              gap: '0.25rem'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openTableModal(table);
                }}
                style={{
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
                title="Edit table"
              >
                ✏️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTable(table.id);
                }}
                disabled={!!table.current_bill_id}
                style={{
                  background: table.current_bill_id ? '#cbd5e0' : '#f56565',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  cursor: table.current_bill_id ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  opacity: table.current_bill_id ? 0.5 : 1
                }}
                title={table.current_bill_id ? 'Cannot delete table with active bill' : 'Delete table'}
              >
                🗑️
              </button>
            </div>

            <div 
              onClick={() => handleOpenTable(table)}
              style={{ cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{
                fontSize: '2.5rem',
                marginBottom: '0.5rem',
              }}>
                🪑
              </div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>
                Table {table.table_number}
              </h3>
              <p style={{ color: '#718096', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                👥 {table.seats} seats
              </p>
              <span className={`badge ${getStatusBadge(table.status)}`}>
                {table.status}
              </span>
              {table.current_bill_id && (
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#ed8936',
                  fontWeight: 'bold'
                }}>
                  🧾 Active Bill
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* POS Order Modal */}
      {showOrderModal && selectedTable && (
        <div className="modal-overlay" onClick={closeOrderModal} style={{ zIndex: 2000 }}>
          <div 
            className="modal" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', width: '1200px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <h3>🪑 Table {selectedTable.table_number} - POS</h3>
              <button className="close-btn" onClick={closeOrderModal}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              {/* Left: Menu Items */}
              <div style={{ flex: 1, overflowY: 'auto', borderRight: '2px solid #e2e8f0', paddingRight: '1rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Menu Items</h4>
                
                {/* Category Filter */}
                <div style={{ marginBottom: '1rem' }}>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Menu Items Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                  {filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: '#f7fafc',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '2px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.background = '#f8f9ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#f7fafc';
                      }}
                      onClick={() => handleAddItem(item)}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.5rem' }}>
                        {item.description}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginTop: '0.5rem'
                      }}>
                        <span style={{ fontWeight: 'bold', color: '#667eea' }}>
                          DOP ${formatPrice(item.price)}
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={quantities[item.id] || 1}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 1;
                            setQuantities({ ...quantities, [item.id]: qty });
                          }}
                          style={{
                            width: '50px',
                            padding: '0.25rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Current Bill */}
              <div style={{ flex: 1, overflowY: 'auto', paddingLeft: '1rem', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ marginBottom: '1rem' }}>Current Order</h4>

                {!currentBill ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ marginBottom: '1rem', color: '#718096' }}>
                      No active bill for this table
                    </p>
                    <button className="btn btn-primary" onClick={handleCreateBill}>
                      🆕 Start New Order
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Bill Items */}
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                      {currentBill.items && currentBill.items.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                              <th style={{ padding: '0.5rem', textAlign: 'right' }}>Price</th>
                              <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentBill.items.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '0.75rem' }}>
                                  <div style={{ fontWeight: '500' }}>{item.name}</div>
                                  {item.notes && (
                                    <div style={{ fontSize: '0.75rem', color: '#718096' }}>Note: {item.notes}</div>
                                  )}
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                  DOP ${formatPrice(item.price)}
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                                  DOP ${(parseFloat(formatPrice(item.price)) * item.quantity).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ color: '#718096', textAlign: 'center', padding: '2rem' }}>
                          No items in order yet. Click menu items to add them.
                        </p>
                      )}
                    </div>

                    {/* Bill Summary */}
                    {currentBill.items && currentBill.items.length > 0 && (
                      <div style={{
                        borderTop: '2px solid #e2e8f0',
                        paddingTop: '1rem',
                        marginTop: 'auto'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong>Subtotal:</strong>
                          <strong>DOP ${formatPrice(currentBill.subtotal)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong>Tax:</strong>
                          <strong>DOP ${formatPrice(currentBill.tax)}</strong>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '1.25rem',
                          fontWeight: 'bold',
                          borderTop: '2px solid #e2e8f0',
                          paddingTop: '0.5rem',
                          marginTop: '0.5rem',
                          color: '#667eea'
                        }}>
                          <span>Total:</span>
                          <span>DOP ${formatPrice(currentBill.total)}</span>
                        </div>
                        <button
                          className="btn btn-success"
                          onClick={handleMarkPaid}
                          style={{ width: '100%', marginTop: '1rem', fontSize: '1.1rem', padding: '1rem' }}
                        >
                          💳 Mark as Paid
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Management Modal */}
      {showTableModal && (
        <div className="modal-overlay" onClick={closeTableModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTable ? 'Edit Table' : 'Add Table'}</h3>
              <button className="close-btn" onClick={closeTableModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmitTable}>
              <div className="form-group">
                <label>Table Number *</label>
                <input
                  type="number"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                  required
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Number of Seats *</label>
                <input
                  type="number"
                  value={formData.seats}
                  onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                  required
                  min="1"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingTable ? 'Update' : 'Create'}
                </button>
                {editingTable && (
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this table?')) {
                        handleDeleteTable(editingTable.id);
                        closeTableModal();
                      }
                    }}
                    disabled={!!editingTable.current_bill_id}
                    style={{ 
                      opacity: editingTable.current_bill_id ? 0.5 : 1,
                      cursor: editingTable.current_bill_id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Delete
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={closeTableModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TablesManager;
