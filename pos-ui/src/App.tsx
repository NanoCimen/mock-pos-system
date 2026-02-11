import { useState } from 'react';
import TablesView from './components/TablesView';
import TicketsView from './components/TicketsView';
import TicketDetail from './components/TicketDetail';

type Tab = 'tables' | 'tickets' | 'ticket';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tables');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="header">
        <h1>YAPos – POS UI</h1>
        <p>Create tables and tickets to test with YAP</p>
      </header>

      <nav className="nav">
        <button
          className={activeTab === 'tables' ? 'active' : ''}
          onClick={() => { setActiveTab('tables'); setSelectedTicketId(null); }}
        >
          Tables
        </button>
        <button
          className={activeTab === 'tickets' ? 'active' : ''}
          onClick={() => { setActiveTab('tickets'); setSelectedTicketId(null); }}
        >
          Tickets
        </button>
        {selectedTicketId && (
          <button
            className={activeTab === 'ticket' ? 'active' : ''}
            onClick={() => setActiveTab('ticket')}
          >
            Ticket
          </button>
        )}
      </nav>

      <main>
        {activeTab === 'tables' && <TablesView />}
        {activeTab === 'tickets' && (
          <TicketsView
            onSelectTicket={(id) => {
              setSelectedTicketId(id);
              setActiveTab('ticket');
            }}
          />
        )}
        {activeTab === 'ticket' && selectedTicketId && (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={() => { setActiveTab('tickets'); setSelectedTicketId(null); }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
