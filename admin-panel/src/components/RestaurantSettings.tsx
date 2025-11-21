import { useState, useEffect } from 'react';
import apiClient from '../api/client';

interface Restaurant {
  id: number;
  name: string;
  tax_rate: number;
  currency: string;
}

function RestaurantSettings() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tax_rate: '',
    currency: '',
  });

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const response = await apiClient.get('/restaurant');
      const rest = response.data.restaurant;
      setRestaurant(rest);
      setFormData({
        name: rest.name,
        tax_rate: rest.tax_rate.toString(),
        currency: rest.currency,
      });
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      setMessage({ type: 'error', text: 'Error loading restaurant settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    setSaving(true);
    setMessage(null);

    try {
      await apiClient.put(`/restaurant/${restaurant.id}`, {
        name: formData.name,
        tax_rate: parseFloat(formData.tax_rate),
        currency: formData.currency,
      });

      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      fetchRestaurant();
    } catch (error) {
      console.error('Error updating restaurant:', error);
      setMessage({ type: 'error', text: 'Error updating settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading settings...</div>;

  if (!restaurant) {
    return (
      <div className="empty-state">
        <h3>No restaurant found</h3>
        <p>Please initialize the database first</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2>Restaurant Settings</h2>
      </div>

      {message && (
        <div className={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Restaurant Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Tax Rate (as decimal, e.g., 0.18 for 18%) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
              required
            />
            <small style={{ color: '#718096', fontSize: '0.875rem' }}>
              Current: {(parseFloat(formData.tax_rate) * 100).toFixed(1)}%
            </small>
          </div>

          <div className="form-group">
            <label>Currency Code *</label>
            <input
              type="text"
              maxLength={3}
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
              required
              placeholder="USD, DOP, etc."
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setFormData({
                  name: restaurant.name,
                  tax_rate: restaurant.tax_rate.toString(),
                  currency: restaurant.currency,
                });
                setMessage(null);
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RestaurantSettings;

