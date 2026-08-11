import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export const AuthPage = () => {
  const { mode } = useParams(); // 'login' or 'register'
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Auth Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [capacity, setCapacity] = useState('');

  // Update isLogin when mode changes
  useEffect(() => {
    setIsLogin(mode === 'login');
  }, [mode]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/portal/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isLogin) {
      // Login
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
      }
      // If successful, useEffect will redirect
    } else {
      // Register
      const payload = { 
        email, 
        password, 
        role: 'contractor', 
        companyName, 
        registrationNumber: regNo, 
        technicalCapacity: capacity 
      };

      try {
        const res = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed.');
        }

        // Navigate to login after successful registration
        alert('Registration successful! Please login with your credentials.');
        navigate('/auth/login');
        setEmail(payload.email);
        setPassword('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setError('');
    if (isLogin) {
      navigate('/auth/register');
    } else {
      navigate('/auth/login');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header-bar">
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
          
          <button 
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        <div className="auth-card">
          <div className="auth-title">
            <h2>TenderBridge</h2>
            <p>{isLogin ? 'Sign in to access your procurement dashboard' : 'Register a new contractor profile'}</p>
          </div>

          {error && (
            <div className="auth-error">
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

            <button 
              type="submit" 
              className="btn btn-primary btn-full-width" 
              disabled={loading}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register Profile'}
            </button>
          </form>

          <div className="auth-toggle">
            {isLogin ? (
              <span>
                Don't have a contractor account?{' '}
                <a href="#register" onClick={(e) => { e.preventDefault(); toggleMode(); }}>
                  Register here
                </a>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <a href="#login" onClick={(e) => { e.preventDefault(); toggleMode(); }}>
                  Log in
                </a>
              </span>
            )}
          </div>

          {/* Seed accounts prompt */}
          <div className="auth-demo-accounts">
            <strong>Demo Accounts (Pre-seeded):</strong>
            <ul>
              <li>Admin: <code>admin@tenderbridge.com</code> / <code>admin123</code></li>
              <li>Contractor: <code>buildcorp@contractor.com</code> / <code>buildcorp123</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
