/**
 * App Component
 * Main application entry point with DomainProvider
 */
import React from 'react';
import './App.css';
import { DomainProvider } from './contexts/DomainProvider';
import Dashboard from './components/Dashboard';
import { DomainSelector } from './components/admin/DomainSelector';

function App() {
  return (
    <DomainProvider defaultDomainId="portfolio">
      <div className="App">
        {/* Domain selector can be hidden or moved to a settings menu */}
        <div style={{ display: 'none' }}>
          <DomainSelector />
        </div>
        <Dashboard />
      </div>
    </DomainProvider>
  );
}

export default App;

