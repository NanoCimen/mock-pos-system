import { useState } from 'react';
import MenuManager from './components/MenuManager';
import TablesManager from './components/TablesManager';
import BillsView from './components/BillsView';
import RestaurantSettings from './components/RestaurantSettings';
import './App.css';

type Tab = 'menu' | 'tables' | 'bills' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('menu');

  return (
    <div className="app">
      <header className="header">
        <h1>🍽️ Mock POS - Admin Panel</h1>
        <p>Manage your restaurant data</p>
      </header>

      <nav className="nav">
        <button
          className={activeTab === 'menu' ? 'active' : ''}
          onClick={() => setActiveTab('menu')}
        >
          📋 Menu Items
        </button>
        <button
          className={activeTab === 'tables' ? 'active' : ''}
          onClick={() => setActiveTab('tables')}
        >
          🪑 Tables
        </button>
        <button
          className={activeTab === 'bills' ? 'active' : ''}
          onClick={() => setActiveTab('bills')}
        >
          🧾 Bills
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>

      <main className="content">
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'tables' && <TablesManager />}
        {activeTab === 'bills' && <BillsView />}
        {activeTab === 'settings' && <RestaurantSettings />}
      </main>
    </div>
  );
}

export default App;
