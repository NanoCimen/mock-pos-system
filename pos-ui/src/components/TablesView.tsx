import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTables, createTable, updateTable, deleteTable, type PosTable } from '../api/client';

export default function TablesView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tables, setTables] = useState<PosTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<PosTable | null>(null);
  const [mesaId, setMesaId] = useState('');
  const [label, setLabel] = useState('');
  const [seats, setSeats] = useState(4);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await getTables();
      setTables(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mesaId.trim()) return;
    setError(null);
    try {
      if (editingTable) {
        await updateTable(editingTable.id, {
          mesa_id: mesaId.trim(),
          label: label.trim() || mesaId.trim(),
          seats,
        });
        setEditingTable(null);
        const oldMesa = editingTable.mesa_id;
        await load();
        if (oldMesa !== mesaId.trim() && location.pathname.startsWith('/tables/')) {
          navigate(`/tables/${encodeURIComponent(mesaId.trim())}`);
        }
      } else {
        await createTable(mesaId.trim(), label.trim() || mesaId.trim(), seats);
        setShowForm(false);
        await load();
      }
      setMesaId('');
      setLabel('');
      setSeats(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : editingTable ? 'Failed to update table' : 'Failed to create table');
    }
  }

  function openEdit(t: PosTable) {
    setEditingTable(t);
    setMesaId(t.mesa_id);
    setLabel(t.label);
    setSeats(t.seats);
    setShowForm(false);
  }

  async function handleDelete(e: React.MouseEvent, t: PosTable) {
    e.stopPropagation();
    if (!confirm(`Delete table "${t.label}" (${t.mesa_id})? This fails if there are open tickets.`)) return;
    setError(null);
    try {
      await deleteTable(t.id);
      await load();
      setEditingTable(null);
      if (location.pathname.startsWith('/tables/') && location.pathname.includes(encodeURIComponent(t.mesa_id))) {
        navigate('/tables');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete table');
    }
  }

  if (loading) return <div className="loading">Loading tables…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Tables</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Add table
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {(showForm || editingTable) && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>{editingTable ? 'Edit table' : 'New table'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Mesa ID *</label>
              <input
                value={mesaId}
                onChange={(e) => setMesaId(e.target.value)}
                placeholder="e.g. mesa_1"
                required
              />
            </div>
            <div className="form-group">
              <label>Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Table 1"
              />
            </div>
            <div className="form-group">
              <label>Seats</label>
              <input
                type="number"
                min={1}
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value, 10) || 4)}
              />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn btn-primary">
                {editingTable ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowForm(false); setEditingTable(null); setMesaId(''); setLabel(''); setSeats(4); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {tables.map((t) => (
          <div
            key={t.id}
            className="card"
            style={{ cursor: 'pointer', position: 'relative' }}
            onClick={() => navigate(`/tables/${encodeURIComponent(t.mesa_id)}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/tables/${encodeURIComponent(t.mesa_id)}`)}
            role="button"
            tabIndex={0}
          >
            <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                title="Edit table"
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                onClick={(e) => handleDelete(e, t)}
                title="Delete table"
              >
                Delete
              </button>
            </div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🪑</div>
            <h3 style={{ margin: '0 0 0.25rem' }}>{t.label}</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
              <code>{t.mesa_id}</code> · {t.seats} seats
            </p>
          </div>
        ))}
      </div>
      {tables.length === 0 && !showForm && (
        <p style={{ color: '#94a3b8' }}>No tables yet. Add one to create tickets for YAP testing.</p>
      )}
    </div>
  );
}
