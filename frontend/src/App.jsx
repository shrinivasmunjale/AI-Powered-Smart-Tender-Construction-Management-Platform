import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import CinematicLanding from './components/CinematicLanding';
import { EnhancedDashboard } from './components/EnhancedDashboard';
import { AuthPage } from './components/AuthPage';
import './App.css';

/**
 * Landing wrapper: routes the "Open Portal" CTA into real URLs.
 */
const Landing = () => {
  const navigate = useNavigate();
  return (
    <CinematicLanding
      onEnterPortal={() => navigate('/portal/dashboard')}
      onLogin={() => navigate('/auth/login')}
      onRegister={() => navigate('/auth/register')}
    />
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="app-root">
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-panel-solid)',
                color: 'var(--text-bright)',
                border: '1px solid var(--border-light)',
                fontSize: '13px',
              },
            }}
          />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/:mode" element={<AuthPage />} />
            {/* Legacy direct routes for convenience */}
            <Route path="/login"    element={<Navigate to="/auth/login"    replace />} />
            <Route path="/register" element={<Navigate to="/auth/register" replace />} />
            <Route path="/portal" element={<EnhancedDashboard />} />
            <Route path="/portal/:view" element={<EnhancedDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;