import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTickets, createTicket, getTables, closeTicket, deleteTicket, type Ticket, type PosTable } from '../api/client';

const DEFAULT_RESTAURANT = 'test_restaurant';

interface TicketsViewProps {
  onSelectTicket?: (ticketId: string) => void;
}

export default function TicketsView({ onSelectTicket }: TicketsViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tables, setTables] = useState<PosTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [mesaId, setMesaId] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ticketList, tableList] = await Promise.all([
        getTickets(),
        getTables(),
      ]);
      setTickets(ticketList);
      setTables(tableList);
      if (tableList.length && !mesaId) setMesaId(tableList[0].mesa_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!mesaId.trim()) return;
    setError(null);
    try {
      const ticket = await createTicket(DEFAULT_RESTAURANT, mesaId.trim());
      setShowCreate(false);
      await load();
      onSelectTicket?.(ticket.id);
      navigate(`/tickets/${ticket.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create ticket');
    }
  }

  async function handleClose(e: React.MouseEvent, t: Ticket) {
    e.stopPropagation();
    if (!confirm('Close this paid ticket?')) return;
    setError(null);
    try {
      await closeTicket(t.id);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to close ticket');
    }
  }

  async function handleDelete(e: React.MouseEvent, t: Ticket) {
    e.stopPropagation();
    if (!confirm('Eliminate this ticket? This cannot be undone.')) return;
    setError(null);
    try {
      await deleteTicket(t.id);
      await load();
      if (location.pathname === `/tickets/${t.id}`) navigate('/tickets');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to eliminate ticket');
    }
  }

  function statusClass(s: string) {
    if (s === 'OPEN') return 'badge-open';
    if (s === 'PARTIALLY_PAID') return 'badge-partial';
    if (s === 'PAID') return 'badge-paid';
    return 'badge-closed';
  }

  if (loading) return <div className="loading">Loading tickets…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Tickets</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New ticket
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showCreate && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>New ticket</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Table (mesa)</label>
              <select value={mesaId} onChange={(e) => setMesaId(e.target.value)}>
                {tables.map((t) => (
                  <option key={t.id} value={t.mesa_id}>{t.label} ({t.mesa_id})</option>
                ))}
                {tables.length === 0 && <option value="">No tables — add tables first</option>}
              </select>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn btn-primary" disabled={!mesaId}>Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {tickets.map((t) => (
          <div
            key={t.id}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              onSelectTicket?.(t.id);
              navigate(`/tickets/${t.id}`);
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span className={`badge ${statusClass(t.status)}`}>{t.status}</span>
                <span style={{ marginLeft: '0.5rem' }}>Mesa: {t.mesa_id}</span>
                <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>
                  {t.total_amount} {t.currency}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {t.status === 'PAID' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    onClick={(e) => handleClose(e, t)}
                  >
                    Close
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={(e) => handleDelete(e, t)}
                >
                  Eliminate
                </button>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#94a3b8' }}>
                  {t.id}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {tickets.length === 0 && !showCreate && (
        <p style={{ color: '#94a3b8' }}>No tickets. Create one to add items and test payments with YAP.</p>
      )}
    </div>
  );
}
