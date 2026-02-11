import { useState, useEffect } from 'react';
import { getTickets, createTicket, getTables, type Ticket, type PosTable } from '../api/client';

const DEFAULT_RESTAURANT = 'test_restaurant';

interface TicketsViewProps {
  onSelectTicket: (ticketId: string) => void;
}

export default function TicketsView({ onSelectTicket }: TicketsViewProps) {
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
      onSelectTicket(ticket.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create ticket');
    }
  }

  function statusClass(s: string) {
    if (s === 'OPEN') return 'badge-open';
    if (s === 'PARTIALLY_PAID') return 'badge-partial';
    return 'badge-paid';
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
            onClick={() => onSelectTicket(t.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span className={`badge ${statusClass(t.status)}`}>{t.status}</span>
                <span style={{ marginLeft: '0.5rem' }}>Mesa: {t.mesa_id}</span>
                <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>
                  {t.total_amount} {t.currency}
                </span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#94a3b8' }}>
                {t.id}
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
