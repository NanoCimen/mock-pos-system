import { useState, useEffect } from 'react';
import { getCloseLogs, type MesaCloseLog } from '../api/client';

export default function CloseLogsView() {
  const [logs, setLogs] = useState<MesaCloseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await getCloseLogs(50);
      setLogs(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="loading">Loading logs…</div>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Closed mesas (logs)</h2>
      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
        Mesas that were closed and what they had. Use this to restart a mesa after closing.
      </p>
      {error && <div className="error">{error}</div>}
      {logs.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: '#94a3b8' }}>No closed mesas yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {logs.map((log) => (
            <div key={log.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong>Mesa:</strong> <code>{log.mesa_id}</code>
                  <span style={{ marginLeft: '1rem', color: '#94a3b8' }}>
                    Ticket: <code style={{ fontSize: '0.85rem' }}>{log.ticket_id}</code>
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{log.total_amount} {log.currency}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    {new Date(log.closed_at).toLocaleString()}
                  </div>
                </div>
              </div>
              {log.items_summary && log.items_summary.length > 0 && (
                <table style={{ width: '100%', marginTop: '0.75rem', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th style={{ textAlign: 'left', padding: '0.25rem 0' }}>Item</th>
                      <th style={{ textAlign: 'right', padding: '0.25rem 0' }}>Price</th>
                      <th style={{ textAlign: 'center', padding: '0.25rem 0' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '0.25rem 0' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.items_summary.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '0.25rem 0' }}>{item.name}</td>
                        <td style={{ textAlign: 'right', padding: '0.25rem 0' }}>{item.price}</td>
                        <td style={{ textAlign: 'center', padding: '0.25rem 0' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '0.25rem 0' }}>{item.price * item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
