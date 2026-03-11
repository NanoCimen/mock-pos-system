import { useState } from 'react';
import { addItems } from '../api/client';

interface AddItemFormProps {
  ticketId: string;
  onAdded: () => void;
}

export default function AddItemForm({ ticketId, onAdded }: AddItemFormProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = Math.round(parseFloat(price));
    if (!name.trim() || isNaN(p) || p < 0) return;
    setError(null);
    setLoading(true);
    try {
      await addItems(ticketId, [{ name: name.trim(), price: p, quantity: quantity || 1 }]);
      setName('');
      setPrice('');
      setQuantity(1);
      onAdded();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add item');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h4 style={{ marginTop: 0 }}>Add item</h4>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Item name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Burger"
            required
          />
        </div>
        <div className="form-group">
          <label>Price (DOP)</label>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1200"
          />
        </div>
        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding…' : 'Add item'}
          </button>
        </div>
      </form>
    </div>
  );
}
