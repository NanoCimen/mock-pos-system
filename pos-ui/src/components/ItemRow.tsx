import type { TicketItem } from '../api/client';
import { updateItemQuantity, removeItem } from '../api/client';

interface ItemRowProps {
  item: TicketItem;
  ticketStatus: string;
  onUpdated: () => void;
  onRemoved: () => void;
}

export default function ItemRow({ item, ticketStatus, onUpdated, onRemoved }: ItemRowProps) {
  const subtotal = item.price * item.quantity;
  const canEdit = ticketStatus === 'OPEN' || ticketStatus === 'PARTIALLY_PAID';
  const locked = item.is_paid;

  async function handleQuantityChange(delta: number) {
    if (!canEdit || locked) return;
    const newQty = Math.max(0, item.quantity + delta);
    if (newQty === 0) {
      try {
        await removeItem(item.id);
        onRemoved();
      } catch {
        onUpdated();
      }
      return;
    }
    try {
      await updateItemQuantity(item.id, newQty);
      onUpdated();
    } catch {
      onUpdated();
    }
  }

  async function handleRemove() {
    if (!canEdit || locked) return;
    if (!confirm('Remove this item?')) return;
    try {
      await removeItem(item.id);
      onRemoved();
    } catch {
      onUpdated();
    }
  }

  return (
    <tr style={{ borderBottom: '1px solid #334155' }}>
      <td style={{ padding: '0.75rem' }}>{item.name}</td>
      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.price}</td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        {canEdit && !locked ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.5rem', minWidth: 28 }}
              onClick={() => handleQuantityChange(-1)}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span style={{ minWidth: 24, display: 'inline-block', textAlign: 'center' }}>
              {item.quantity}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.5rem', minWidth: 28 }}
              onClick={() => handleQuantityChange(1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </span>
        ) : (
          item.quantity
        )}
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{subtotal}</td>
      <td style={{ padding: '0.75rem' }}>
        {canEdit && !locked ? (
          <button
            type="button"
            className="btn btn-danger"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            onClick={handleRemove}
            title="Remove item"
          >
            🗑 Remove
          </button>
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
}
