import { useState, useEffect } from 'react';
import apiClient from '../api/client';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number | string; // PostgreSQL returns numeric as string
  description?: string;
  available: boolean;
}

// Helper function to safely format price
const formatPrice = (price: number | string | undefined): string => {
  if (price === undefined || price === null) return '0.00';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
};

function MenuManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'main',
    price: '',
    description: '',
    available: true,
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await apiClient.get('/menu');
      setItems(response.data.items);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        await apiClient.put(`/menu/${editingItem.id}`, {
          ...formData,
          price: parseFloat(formData.price),
        });
      } else {
        await apiClient.post('/menu', {
          ...formData,
          price: parseFloat(formData.price),
        });
      }
      
      fetchMenuItems();
      closeModal();
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Error saving menu item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await apiClient.delete(`/menu/${id}`);
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Error deleting menu item');
    }
  };

  const openModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        price: typeof item.price === 'string' ? item.price : item.price.toString(),
        description: item.description || '',
        available: item.available,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: 'main',
        price: '',
        description: '',
        available: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  if (loading) return <div className="loading">Loading menu items...</div>;

  return (
    <div>
      <div className="section-header">
        <h2>Menu Items</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Add Menu Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <h3>No menu items yet</h3>
          <p>Create your first menu item to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.description && (
                      <div style={{ fontSize: '0.875rem', color: '#718096' }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {item.category}
                    </span>
                  </td>
                  <td>DOP ${formatPrice(item.price)}</td>
                  <td>
                    <span className={`badge ${item.available ? 'badge-success' : 'badge-danger'}`}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ marginRight: '0.5rem' }}
                      onClick={() => openModal(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="appetizer">Appetizer</option>
                  <option value="main">Main Course</option>
                  <option value="dessert">Dessert</option>
                  <option value="beverage">Beverage</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Price (DOP) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    style={{ width: 'auto', marginRight: '0.5rem' }}
                  />
                  Available
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
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

export default MenuManager;

