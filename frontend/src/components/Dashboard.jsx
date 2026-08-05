import React, { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';
import ContractorDashboard from './ContractorDashboard';
import NotificationLogger from './NotificationLogger';
import { Shield, Layout, RefreshCw, LogOut, FileText, ArrowLeft } from 'lucide-react';

export default function Dashboard({ onBackToLanding }) {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Auth Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [capacity, setCapacity] = useState('');

  // Fetch current user details if token exists
  const fetchProfile = async (currentToken) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Clear expired session
        handleLogout();
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setError('');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? 'login' : 'register';
    const payload = isLogin 
      ? { email, password } 
      : { 
          email, 
          password, 
          role: 'contractor', 
          companyName, 
          registrationNumber: regNo, 
          technicalCapacity: capacity 
        };

    try {
      const res = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      if (isLogin) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      } else {
        // Toggle to login after registration
        setIsLogin(true);
        setEmail(payload.email);
        setPassword('');
        alert('Registration successful! Please login with your credentials.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Demo Switch Role function (Auto-login to seeded credentials)
  const handleDemoSwitchRole = async () => {
    setLoading(true);
    const targetEmail = user?.role === 'admin' 
      ? 'buildcorp@contractor.com' 
      : 'admin@tenderbridge.com';
    
    const targetPassword = user?.role === 'admin' 
      ? 'buildcorp123' 
      : 'admin123';

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      } else {
        alert('Failed to swap roles. Make sure backend is running and seeded.');
      }
    } catch (err) {
      console.error('Error swapping roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateContractorStatus = (newStatus) => {
    if (user && user.Contractor) {
      setUser({
        ...user,
        Contractor: {
          ...user.Contractor,
          verificationStatus: newStatus
        }
      });
    }
  };

  if (!token || !user) {
    return (
      <div className="auth-wrapper">
        <div className="glass-card auth-card">
          <button 
            onClick={onBackToLanding} 
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back to Landing Page
          </button>
          
          <div className="auth-header">
            <h2>TenderBridge</h2>
            <p>{isLogin ? 'Sign in to access your procurement dashboard' : 'Register a new contractor profile'}</p>
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', background: 'rgba(255,90,95,0.1)', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleAuthSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Company Legal Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. BuildCorp Ltd"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Registration Number / Tax ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. REG-12345"
                    value={regNo}
                    onChange={e => setRegNo(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Technical Capabilities / Fields</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Masonry, bridge building, structural concrete"
                    value={capacity}
                    onChange={e => setCapacity(e.target.value)}
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register Profile'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {isLogin ? (
              <span>
                Don't have a contractor account?{' '}
                <a href="#register" style={{ color: 'var(--primary)' }} onClick={() => setIsLogin(false)}>
                  Register here
                </a>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <a href="#login" style={{ color: 'var(--primary)' }} onClick={() => setIsLogin(true)}>
                  Log in
                </a>
              </span>
            )}
          </div>

          {/* Seed accounts prompt */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-muted)' }}>
            <strong>Demo Accounts (Pre-seeded):</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
              <li>Admin: <code>admin@tenderbridge.com</code> / <code>admin123</code></li>
              <li>Contractor: <code>buildcorp@contractor.com</code> / <code>buildcorp123</code></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-portal">
      {/* Portal Header */}
      <header className="portal-header">
        <div className="logo-section">
          <a className="portal-logo" href="#dashboard">TenderBridge Portal</a>
          <span className={`role-tag ${user.role}`}>
            {user.role} {user.role === 'contractor' ? `(${user.Contractor?.verificationStatus})` : ''}
          </span>
        </div>
        
        <div className="header-controls">
          <button onClick={onBackToLanding} className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
            <ArrowLeft size={14} /> Back to Home
          </button>

          {/* Quick Demo Switcher */}
          <button 
            className="role-switcher-btn" 
            onClick={handleDemoSwitchRole}
            disabled={loading}
            title={`Quick toggle to ${user.role === 'admin' ? 'Contractor' : 'Admin'} view for evaluation`}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Switch to {user.role === 'admin' ? 'Contractor View' : 'Admin View'}
          </button>

          <span className="user-profile">
            {user.email}
          </span>

          <button onClick={handleLogout} className="btn btn-danger btn-sm" title="Log Out">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <div className="portal-container">
        <main className="portal-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '28px' }}>
              Welcome back, {user.role === 'admin' ? 'Municipal Officer' : user.Contractor?.companyName || 'Contractor'}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              System Status: <strong style={{ color: 'var(--success)' }}>Online & Auditing</strong>
            </div>
          </div>

          {user.role === 'admin' ? (
            <AdminDashboard token={token} />
          ) : (
            <ContractorDashboard 
              token={token} 
              contractorStatus={user.Contractor?.verificationStatus}
              companyName={user.Contractor?.companyName}
              onStatusUpdate={updateContractorStatus}
            />
          )}
        </main>
      </div>

      {/* Real-time Notification Logs Panel */}
      <NotificationLogger token={token} />
    </div>
  );
}
