import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/config';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  CheckCircle2, 
  Star, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  Building2, 
  ShieldCheck, 
  Sun, 
  Moon,
  Box,
  Globe,
  Zap,
  Compass,
  Layers,
  ArrowLeft,
  Landmark
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './auth/AuthPage.css';

export const AuthPage = () => {
  const { mode } = useParams(); // 'login' or 'register'
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State (Aligned with User, Contractor & Organization PostgreSQL Schema)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('contractor'); // 'contractor' (Corporation/Builder) | 'organization' (Tender Issuer)
  const [companyName, setCompanyName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Update isLogin when URL param changes
  useEffect(() => {
    setIsLogin(mode === 'login');
    setError('');
    setRegistrationSuccess(false);
  }, [mode]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/portal/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Dynamic Password Strength Meter (0 to 4 bars)
  const calculateStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Empty' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8 && /[0-9]/.test(pwd)) score++;
    if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    // Label mapping
    const labels = ['Too short', 'Weak', 'Decent', 'Strong', 'Unbreakable'];
    return { score, label: labels[score] || 'Decent' };
  };

  const strength = calculateStrength(password);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isLogin) {
      // Login with credentials
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Invalid email or password.');
        setLoading(false);
      }
    } else {
      // Register with User table schema fields
      const payload = {
        fullName,
        email,
        password,
        phone,
        role,
        companyName: role === 'contractor' ? (companyName || (fullName ? `${fullName} Enterprises` : undefined)) : undefined,
        organizationName: role === 'organization' ? (companyName || (fullName ? `${fullName} Department` : undefined)) : undefined,
        registrationNumber: regNo || undefined
      };

      try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed.');
        }

        // Show pending authorization notice
        setRegistrationSuccess(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleAuthMode = () => {
    setError('');
    if (isLogin) {
      navigate('/auth/register');
    } else {
      navigate('/auth/login');
    }
  };

  return (
    <div className="aurora-auth-root">
      {/* Aurora Layer (Stack of 5 blurred drifting radial blooms) */}
      <div className="aurora-canvas" aria-hidden="true" />

      {/* Grain & Vignette Layer */}
      <div className="grain-layer" aria-hidden="true" />

      {/* Sticky Translucent Glass Nav */}
      <header className="glass-nav">
        <div className="glass-nav-inner">
          <button 
            className="brand-lockup" 
            onClick={() => navigate('/')} 
            title="Return to TenderBridge Home"
          >
            <div className="brand-tile">
              <Sparkles size={18} strokeWidth={2.4} />
            </div>
            <span className="brand-name">TenderBridge</span>
          </button>

          <nav className="nav-links-center" aria-label="Quick links">
            <button className="nav-link-item" onClick={() => navigate('/')}>Product</button>
            <button className="nav-link-item" onClick={() => navigate('/portal/tenders')}>Live Tenders</button>
            <button className="nav-link-item" onClick={() => navigate('/portal/projects')}>Projects</button>
            <button className="nav-link-item" onClick={() => navigate('/portal/reports')}>Audit Docs</button>
          </nav>

          <div className="nav-actions-right">
            {/* Mode Switching Toggle Button */}
            <button 
              className="nav-mode-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              aria-label="Toggle theme mode"
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            <button 
              className="nav-link-toggle"
              onClick={toggleAuthMode}
            >
              {isLogin ? 'Create account' : 'Sign in'}
            </button>

            <button 
              className="chip"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Hero Shell */}
      <main className="hero-main" id="signup">
        <div className="hero-container">
          
          {/* LEFT COLUMN: Project Value Proposition */}
          <div className="hero-pitch">
            <div className="trial-pill">
              <span className="pulse-dot" />
              <span>Smart Tender & Construction Management Platform</span>
            </div>

            <h1 className="hero-headline">
              Procurement at the <br />
              <span className="grad-text">speed of trust.</span>
            </h1>

            <p className="hero-paragraph">
              A comprehensive end-to-end procurement and construction platform connecting government authorities and certified contractors. Streamline tender publishing, submit encrypted bids, and leverage automated multi-criteria evaluation.
            </p>

            <div className="benefit-list">
              <div className="benefit-item">
                <CheckCircle2 size={18} className="benefit-icon" />
                <span>Tamper-proof encrypted bid submissions & verifiable KYC</span>
              </div>
              <div className="benefit-item">
                <CheckCircle2 size={18} className="benefit-icon" />
                <span>Automated multi-criteria comparison, scoring & AI analysis</span>
              </div>
              <div className="benefit-item">
                <CheckCircle2 size={18} className="benefit-icon" />
                <span>Live milestone tracking, audit logging & instant alert dispatches</span>
              </div>
            </div>

            <div className="social-proof-cluster">
              <div className="avatar-stack">
                <div className="avatar-chip av-1" />
                <div className="avatar-chip av-2" />
                <div className="avatar-chip av-3" />
                <div className="avatar-chip av-4" />
              </div>
              <div className="rating-line">
                <Star size={15} fill="#facc15" className="rating-star" />
                <span className="rating-score">4.9/5</span>
                <span>trusted by municipal bodies & verified contractors</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Frosted Glass Auth Card */}
          <div className="hero-card-col">
            <div className="card-glow glass glass-sheen">
              <div className="auth-card-inner">
                
                {/* Heading Block */}
                <div className="card-heading-block">
                  <h2 className="card-title">
                    {isLogin ? 'Welcome back' : 'Create your account'}
                  </h2>
                  <p className="card-subtitle">
                    {isLogin 
                      ? 'Sign in to access your procurement portal.' 
                      : 'Register your contractor or organization profile.'}
                  </p>
                </div>

                {registrationSuccess ? (
                  <div className="registration-success-block" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(45, 212, 191, 0.15)', color: '#2dd4bf', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--slate-100)' }}>
                      Registration Submitted!
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--slate-400)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                      Your {role === 'organization' ? 'Organization (Issuer)' : 'Corporation / Builder'} authorization request has been sent to the Platform Administrator.
                      Once your credentials are reviewed and authorized, you can log in to access the platform.
                    </p>
                    <button 
                      type="button" 
                      className="btn-grad"
                      onClick={() => { setRegistrationSuccess(false); setIsLogin(true); navigate('/auth/login'); }}
                    >
                      <span>Proceed to Sign In</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                  {/* Auth Form */}
                  <form className="auth-form" onSubmit={handleAuthSubmit}>
                    {error && (
                      <div className="auth-alert-error">
                        <span>⚠</span>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Sign Up Schema Fields */}
                    {!isLogin && (
                      <>
                        <div className="field-wrap">
                          <User size={18} className="field-icon" />
                          <input
                            type="text"
                            className="field"
                            placeholder="Full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required={!isLogin}
                          />
                        </div>

                        {/* Role Selector (Aligned with Manager's Model) */}
                        <div className="role-selector-wrap">
                          <label className="role-selector-label">Account Role</label>
                          <div className="role-pill-grid">
                            <button
                              type="button"
                              className={`role-pill-btn ${role === 'contractor' ? 'active' : ''}`}
                              onClick={() => setRole('contractor')}
                            >
                              <Building2 size={14} /> Corporation / Builder
                            </button>
                            <button
                              type="button"
                              className={`role-pill-btn ${role === 'organization' ? 'active' : ''}`}
                              onClick={() => setRole('organization')}
                            >
                              <ShieldCheck size={14} /> Organization (Issuer)
                            </button>
                          </div>
                        </div>

                        {/* Entity Name Field */}
                        <div className="field-wrap">
                          <Building2 size={18} className="field-icon" />
                          <input
                            type="text"
                            className="field"
                            placeholder={role === 'organization' ? "Organization / Authority Name" : "Company / Builder Name"}
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                          />
                        </div>

                        {/* Registration Number Field */}
                        <div className="field-wrap">
                          <ShieldCheck size={18} className="field-icon" />
                          <input
                            type="text"
                            className="field"
                            placeholder={role === 'organization' ? "Org Registration / Tax ID" : "Contractor License / Reg Number"}
                            value={regNo}
                            onChange={(e) => setRegNo(e.target.value)}
                            required
                          />
                        </div>

                        {/* Phone Field */}
                        <div className="field-wrap">
                          <User size={18} className="field-icon" />
                          <input
                            type="tel"
                            className="field"
                            placeholder="Contact Phone Number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {/* Email Field */}
                    <div className="field-wrap">
                      <Mail size={18} className="field-icon" />
                      <input
                        type="email"
                        className="field"
                        placeholder="you@studio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    {/* Password Field */}
                    <div className="field-wrap">
                      <Lock size={18} className="field-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="field field-with-toggle"
                        placeholder={isLogin ? 'Enter your password' : 'Create a password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-pwd-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    {/* Four-segment password-strength meter (Registration mode) */}
                    {!isLogin && (
                      <div className="strength-meter">
                        <div className={`strength-bar ${strength.score >= 1 ? 'active' : ''}`} />
                        <div className={`strength-bar ${strength.score >= 2 ? 'active' : ''}`} />
                        <div className={`strength-bar ${strength.score >= 3 ? 'active' : ''}`} />
                        <div className={`strength-bar ${strength.score >= 4 ? 'active' : ''}`} />
                        <span className="strength-label">{password ? strength.label : 'Decent'}</span>
                      </div>
                    )}

                    {/* Primary CTA */}
                    <button 
                      type="submit" 
                      className="btn-grad"
                      disabled={loading}
                    >
                      {loading ? (
                        <span>Processing...</span>
                      ) : (
                        <>
                          <span>{isLogin ? 'Sign in' : 'Create account'}</span>
                          <ArrowRight size={16} strokeWidth={2.4} />
                        </>
                      )}
                    </button>

                    {/* Legal footnote */}
                    <p className="footnote-legal">
                      By signing up you agree to our{' '}
                      <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a> and{' '}
                      <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
                    </p>
                  </form>
                  </>
                )}

              </div>
            </div>

            {/* Switch Mode Link beneath the Card */}
            <div className="switch-auth-link">
              <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
              <button 
                type="button" 
                className="switch-auth-btn grad-text"
                onClick={toggleAuthMode}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Trust Strip (Full-bleed glass) */}
      <section className="trust-strip">
        <div className="trust-inner">
          <p className="trust-label">Trusted across public infrastructure & procurement bodies</p>
          <div className="trust-logos">
            <div className="logo-item">
              <Landmark size={20} />
              <span>Municipal Corp</span>
            </div>
            <div className="logo-item">
              <Building2 size={20} />
              <span>Public Works Dept</span>
            </div>
            <div className="logo-item">
              <ShieldCheck size={20} />
              <span>State Highways</span>
            </div>
            <div className="logo-item">
              <Layers size={20} />
              <span>Metro Transit</span>
            </div>
            <div className="logo-item">
              <Globe size={20} />
              <span>Urban Development</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

