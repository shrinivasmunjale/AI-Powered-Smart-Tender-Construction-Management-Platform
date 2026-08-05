import React, { useState } from 'react';
import CinematicLanding from './components/CinematicLanding';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  // Navigation view: 'landing' or 'portal'
  const [view, setView] = useState('landing');

  return (
    <div className="app-root">
      {view === 'landing' ? (
        <CinematicLanding onEnterPortal={() => setView('portal')} />
      ) : (
        <Dashboard onBackToLanding={() => setView('landing')} />
      )}
    </div>
  );
}

export default App;
