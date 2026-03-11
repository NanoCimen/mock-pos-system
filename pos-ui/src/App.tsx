import { Routes, Route, NavLink } from 'react-router-dom';
import TablesView from './components/TablesView';
import TableDetail from './components/TableDetail';
import TicketsView from './components/TicketsView';
import TicketDetail from './components/TicketDetail';

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>YAPos – POS UI</h1>
        <p>Create tables and tickets to test with YAP</p>
      </header>

      <nav className="nav">
        <NavLink to="/tables" className={({ isActive }) => (isActive ? 'active' : '')}>
          Tables
        </NavLink>
        <NavLink to="/tickets" className={({ isActive }) => (isActive ? 'active' : '')}>
          Tickets
        </NavLink>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<TablesView />} />
          <Route path="/tables" element={<TablesView />} />
          <Route path="/tables/:mesa_id" element={<TableDetail />} />
          <Route path="/tickets" element={<TicketsView />} />
          <Route path="/tickets/:ticketId" element={<TicketDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
