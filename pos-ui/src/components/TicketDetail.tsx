import { useState, useEffect } from 'react';
import { getTicket, addItems, removeItem, type Ticket } from '../api/client';

interface TicketDetailProps {
  ticketId: string;
  onBack: () => void;
}

export default function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    load();
  }, [ticketId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const t = await getTicket(ticketId);
      setTicket(t);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    const p = Math.round(parseFloat(price));
    if (!name.trim() || isNaN(p) || p < 0) return;
    setError(null);
    try {
      await addItems(ticketId, [{ name: name.trim(), price: p, quantity: quantity || 1 }]);
      setName('');
      setPrice('');
      setQuantity(1);
      setShowAddItem(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add item');
    }
  }

  async function handleRemoveItem(itemId: string, isPaid: boolean) {
    if (isPaid) return;
    if (!confirm('Remove this item from the ticket?')) return;
    setError(null);
    try {
      await removeItem(itemId);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove item');
    }
  }

  function copyTicketId() {
    if (!ticket) return;
    navigator.clipboard.writeText(ticket.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function statusClass(s: string) {
    if (s === 'OPEN') return 'badge-open';
    if (s === 'PARTIALLY_PAID') return 'badge-partial';
    return 'badge-paid';
  }

  if (loading) return <div className="loading">Loading ticket…</div>;
  if (!ticket) return <div className="error">{error || 'Ticket not found'}</div>;

  return (
    <div>
      <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '1rem' }}>
        ← Back to tickets
      </button>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span className={`badge ${statusClass(ticket.status)}`}>{ticket.status}</span>
            <span style={{ marginLeft: '0.5rem' }}>Mesa: {ticket.mesa_id}</span>
          </div>
          <div>
            <strong>Total: {ticket.total_amount} {ticket.currency}</strong>
          </div>
        </div>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>
          Use this ticket ID with YAP to test payments:
        </p>
        <div className="ticket-id-box">
          {ticket.id}
          <button type="button" className="btn btn-secondary copy-btn" onClick={copyTicketId}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>Items</h3>
        <button className="btn btn-primary" onClick={() => setShowAddItem(true)}>
          + Add item
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showAddItem && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h4 style={{ marginTop: 0 }}>Add line item</h4>
          <form onSubmit={handleAddItem}>
            <div className="form-group">
              <label>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee" required />
            </div>
            <div className="form-group">
              <label>Price (DOP)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="320"
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
              <button type="submit" className="btn btn-primary">Add</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddItem(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {ticket.items && ticket.items.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #334155' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Item</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Price</th>
              <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
              <th style={{ padding: '0.5rem' }}>Paid</th>
              <th style={{ padding: '0.5rem', width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {ticket.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '0.75rem' }}>{item.name}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.price}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.price * item.quantity}</td>
                <td style={{ padding: '0.75rem' }}>{item.is_paid ? '✓' : '—'}</td>
                <td style={{ padding: '0.75rem' }}>
                  {!item.is_paid && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      onClick={() => handleRemoveItem(item.id, item.is_paid)}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: '#94a3b8' }}>No items. Add items then use the ticket ID above with YAP to pay.</p>
      )}
    </div>
  );
}
