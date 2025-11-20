/**
 * App Component
 * Main application entry point with DomainProvider and PersonaProvider
 */
import React, { useEffect } from 'react';
import './App.css';
import { DomainProvider } from './contexts/DomainProvider';
import { PersonaProvider } from './contexts/PersonaContext';
import { initializeAccounts } from './services/PersonaAccountService';
import Dashboard from './components/Dashboard';
import { DomainSelector } from './components/admin/DomainSelector';

function App() {
  // Initialize persona accounts on app startup
  useEffect(() => {
    initializeAccounts();
  }, []);

  return (
    <DomainProvider defaultDomainId="portfolio">
      <PersonaProvider defaultRole="Business" defaultPersona="PM">
        <div className="App">
          {/* Domain selector can be hidden or moved to a settings menu */}
          <div style={{ display: 'none' }}>
            <DomainSelector />
          </div>
          <Dashboard />
        </div>
      </PersonaProvider>
    </DomainProvider>
  );
}

export default App;

