import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTables,
  getTickets,
  getTicket,
  createTicket,
  type PosTable,
  type Ticket,
} from '../api/client';
import ItemRow from './ItemRow';
import AddItemForm from './AddItemForm';

const DEFAULT_RESTAURANT = 'test_restaurant';

export default function TableDetail() {
  const { mesa_id } = useParams<{ mesa_id: string }>();
  const navigate = useNavigate();
  const [table, setTable] = useState<PosTable | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadTable() {
    if (!mesa_id) return;
    const tables = await getTables();
    const t = tables.find((x) => x.mesa_id === mesa_id) ?? null;
    setTable(t);
  }

  async function loadTicket() {
    if (!mesa_id) return;
    const tickets = await getTickets({ mesaId: mesa_id });
    const openOrPartial = tickets.filter(
      (t) => t.status === 'OPEN' || t.status === 'PARTIALLY_PAID'
    );
    const active = openOrPartial[0] ?? tickets[0] ?? null;
    if (active) {
      const full = await getTicket(active.id);
      setTicket(full);
    } else {
      setTicket(null);
    }
  }

  async function load() {
    if (!mesa_id) return;
    setLoading(true);
    setError(null);
    try {
      await loadTable();
      await loadTicket();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [mesa_id]);

  async function handleCreateTicket() {
    if (!mesa_id) return;
    setError(null);
    setCreating(true);
    try {
      const newTicket = await createTicket(DEFAULT_RESTAURANT, mesa_id);
      const full = await getTicket(newTicket.id);
      setTicket(full);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create ticket');
    } finally {
      setCreating(false);
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

  if (loading) return <div className="loading">Loading…</div>;
  if (!mesa_id) return <div className="error">Missing table</div>;

  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ marginBottom: '1rem' }}
        onClick={() => navigate('/tables')}
      >
        ← Back to tables
      </button>

      {/* Header: table label, mesa_id, seats */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ margin: '0 0 0.5rem' }}>{table?.label ?? mesa_id}</h2>
        <p style={{ margin: 0, color: '#94a3b8' }}>
          <code>{mesa_id}</code>
          {table != null && ` · ${table.seats} seats`}
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      {!ticket ? (
        <div className="card">
          <p style={{ margin: '0 0 1rem', color: '#94a3b8' }}>
            No active ticket for this table.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={creating}
            onClick={handleCreateTicket}
          >
            {creating ? 'Creating…' : 'Create ticket for this table'}
          </button>
        </div>
      ) : (
        <>
          {/* Ticket section */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span className={`badge ${statusClass(ticket.status)}`}>{ticket.status}</span>
                <span style={{ marginLeft: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Ticket ID: <code style={{ wordBreak: 'break-all' }}>{ticket.id}</code>
                </span>
              </div>
              <button type="button" className="btn btn-success" onClick={copyTicketId}>
                {copied ? 'Copied!' : 'Copy Ticket ID'}
              </button>
            </div>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>
              Created: {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>

          {/* Items list */}
          <div className="card" style={{ marginBottom: '0.5rem' }}>
            <h4 style={{ marginTop: 0 }}>Items</h4>
            {ticket.items && ticket.items.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #334155' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Price</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Subtotal</th>
                    <th style={{ padding: '0.5rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {ticket.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      ticketStatus={ticket.status}
                      onUpdated={loadTicket}
                      onRemoved={loadTicket}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#94a3b8', margin: 0 }}>No items yet.</p>
            )}
            {ticket.items && ticket.items.length > 0 && (
              <p style={{ marginTop: '1rem', fontWeight: 'bold', textAlign: 'right' }}>
                Total: {ticket.total_amount} {ticket.currency}
              </p>
            )}
          </div>

          <AddItemForm ticketId={ticket.id} onAdded={loadTicket} />
        </>
      )}
    </div>
  );
}
