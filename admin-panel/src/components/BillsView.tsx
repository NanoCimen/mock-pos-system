import { useState, useEffect } from 'react';
import apiClient from '../api/client';

interface Bill {
  id: number;
  table_number: number;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  items?: BillItem[];
}

interface BillItem {
  name: string;
  price: number;
  quantity: number;
}

function BillsView() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await apiClient.get('/bills');
      setBills(response.data.bills);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewBillDetails = async (billId: number) => {
    try {
      const response = await apiClient.get(`/bills/${billId}`);
      setSelectedBill(response.data.bill);
    } catch (error) {
      console.error('Error fetching bill details:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      open: 'badge-warning',
      paid: 'badge-success',
      cancelled: 'badge-danger',
    };
    return badges[status] || 'badge-secondary';
  };

  if (loading) return <div className="loading">Loading bills...</div>;

  return (
    <div>
      <div className="section-header">
        <h2>Bills</h2>
        <button className="btn btn-secondary" onClick={fetchBills}>
          🔄 Refresh
        </button>
      </div>

      {bills.length === 0 ? (
        <div className="empty-state">
          <h3>No bills yet</h3>
          <p>Bills will appear here once tables place orders</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Table</th>
                <th>Status</th>
                <th>Subtotal</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td><strong>#{bill.id}</strong></td>
                  <td>Table {bill.table_number}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(bill.status)}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td>DOP ${parseFloat(bill.subtotal).toFixed(2)}</td>
                  <td>DOP ${parseFloat(bill.tax).toFixed(2)}</td>
                  <td><strong>DOP ${parseFloat(bill.total).toFixed(2)}</strong></td>
                  <td>{new Date(bill.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={() => viewBillDetails(bill.id)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedBill && (
        <div className="modal-overlay" onClick={() => setSelectedBill(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bill #{selectedBill.id} - Table {selectedBill.table_number}</h3>
              <button className="close-btn" onClick={() => setSelectedBill(null)}>×</button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <span className={`badge ${getStatusBadge(selectedBill.status)}`}>
                {selectedBill.status}
              </span>
            </div>

            {selectedBill.items && selectedBill.items.length > 0 ? (
              <>
                <h4 style={{ marginBottom: '1rem' }}>Items</h4>
                <table style={{ marginBottom: '1rem' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBill.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>DOP ${parseFloat(item.price).toFixed(2)}</td>
                        <td>DOP ${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>Subtotal:</strong>
                    <strong>DOP ${parseFloat(selectedBill.subtotal).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>Tax:</strong>
                    <strong>DOP ${parseFloat(selectedBill.tax).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', borderTop: '2px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span>Total:</span>
                    <span>DOP ${parseFloat(selectedBill.total).toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p>No items in this bill</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BillsView;

