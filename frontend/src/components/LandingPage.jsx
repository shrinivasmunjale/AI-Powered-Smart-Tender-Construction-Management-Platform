import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../utils/config';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  BellRing,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileSearch,
  Landmark,
  Lock,
  Menu,
  PenLine,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from './layout/ThemeToggle';
import './landing/LandingPage.css';

/* ------------------------------------------------------------------ */
/*  Small helpers                                                       */
/* ------------------------------------------------------------------ */

/** Fade/slide content in when it scrolls into view. */
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

const money = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const daysLeft = (deadline) =>
  Math.max(0, Math.ceil((new Date(deadline) - Date.now()) / 86400000));

const statusMeta = (status) => {
  switch (status) {
    case 'published':
      return { label: 'Open', className: 'open' };
    case 'under_evaluation':
      return { label: 'Evaluating', className: 'evaluating' };
    case 'awarded':
      return { label: 'Awarded', className: 'awarded' };
    case 'closed':
      return { label: 'Closed', className: 'closed' };
    default:
      return { label: 'Draft', className: 'draft' };
  }
};

/* ------------------------------------------------------------------ */
/*  Fallback sample data (used when the API is offline)         */
/* ------------------------------------------------------------------ */

const SAMPLE_TENDERS = [
  {
    id: 1,
    title: 'Stari Most Arch Restoration',
    description:
      'Stone-by-stone structural mapping and reinforcement of the historic arch using local limestone.',
    category: 'Infrastructure',
    estimatedBudget: 2400000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    status: 'published',
  },
  {
    id: 2,
    title: 'City Smart Lighting Grid Upgrade',
    description:
      'Deploy modular smart LED controllers with real-time analytics and failure alert modules.',
    category: 'Technology',
    estimatedBudget: 800000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    status: 'published',
  },
  {
    id: 3,
    title: 'Neretva River Water Filtration Plant',
    description:
      'Construction of a biological filtration sub-facility near the riverbank with a high technical specification.',
    category: 'Environmental',
    estimatedBudget: 1200000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(),
    status: 'published',
  },
  {
    id: 4,
    title: 'Bazaar Lane Cobblestone Resurfacing',
    description:
      'Traditional stone replacement for 500 meters of the historic bazaar lane without business interruption.',
    category: 'Civil Works',
    estimatedBudget: 300000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    status: 'under_evaluation',
  },
  {
    id: 5,
    title: 'Municipal Hospital Supply Vault',
    description:
      'Surgical-grade storage and secure supply room construction with special concrete fortification.',
    category: 'Civil Works',
    estimatedBudget: 450000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    status: 'published',
  },
];

const TRUSTED_BY = [
  'BuildCorp Industries',
  'GridTech Energy',
  'GreenWater Bio',
  'CityWorks Authority',
  'Meridian Structures',
  'Atlas Infrastructure',
  'NexaBuild',
  'Summit Civil',
];

const FEATURES = [
  { icon: FileSearch, title: 'Automated Auditing', description: 'Bid worksheets are structured and compiled automatically into audit-ready, traceable comparisons.' },
  { icon: Lock, title: 'Encrypted Bids', description: 'Every submitted cost sheet is sealed with tamper-proof encryption from upload until evaluation.' },
  { icon: BadgeCheck, title: 'Verified Contractors', description: 'Licensing and technical capacity are validated before suppliers unlock curated opportunities.' },
  { icon: Bot, title: 'AI Assistant', description: 'Answers, drafting help, and personalized recommendations from the built-in AI copilot.' },
  { icon: BellRing, title: 'Real-time Alerts', description: 'Automated email and SMS pings fire the moment a matching opportunity is published or awarded.' },
  { icon: BarChart3, title: 'Smart Comparison', description: 'Composite scoring weighs price and delivery speed to rank proposals best-to-worst in one click.' },
];

const STEPS = [
  { icon: PenLine, step: '01', title: 'Publish a tender', description: 'Authorities craft specifications, set budget and deadlines, then broadcast to every verified contractor.' },
  { icon: Send, step: '02', title: 'Contractors submit sealed bids', description: 'Suppliers reply with encrypted price worksheets and technical pitches - tamper-evident by design.' },
  { icon: BarChart3, step: '03', title: 'Compare automatically', description: 'The composite engine scores every proposal against budget and timeline, surfacing the strongest fit.' },
  { icon: Award, step: '04', title: 'Award and notify instantly', description: 'Winning contractors and runner-ups are notified automatically, and every action is logged for audit.' },
];

const TESTIMONIALS = [
  { quote: 'Evaluation time on our infrastructure tenders decreased by more than half. The comparison engine in seconds does what used to take our team weeks.', name: 'Amira Kovacevic', role: 'Procurement Director, CityWorks Authority' },
  { quote: 'As a contractor, the verified pipeline means I only see opportunities I am actually qualified for. No more wasted work.', name: 'Milan Petrovic', role: 'Managing Partner, BuildCorp Industries' },
  { quote: 'The audit trail is flawless. Every decision, every bid, every notification is logged. Compliance reporting went from painful to automatic.', name: 'Sofia Marchetti', role: 'Compliance Lead, Meridian Structures' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tenders, setTenders] = useState(SAMPLE_TENDERS);
  const [tendersLoading, setTendersLoading] = useState(true);
  const visibleTenders = tenders.slice(0, 6);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/public/tenders`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('bad response'))))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) setTenders(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTendersLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const navTo = (path) => { setMenuOpen(false); navigate(path); };
  const goSection = (id) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div className="landing-page">
      <header className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="landing-container landing-nav-inner">
          <button className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="TenderBridge home">
            <span className="landing-logo-mark"><Landmark size={20} strokeWidth={2.2} /></span>
            <span className="landing-logo-text">Tender<span>Bridge</span></span>
          </button>
          <nav className={`landing-nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Primary">
            <button onClick={() => goSection('features')}>Features</button>
            <button onClick={() => goSection('how-it-works')}>How it works</button>
            <button onClick={() => goSection('tenders')}>Live tenders</button>
            <button onClick={() => goSection('testimonials')}>Testimonials</button>
            <div className="landing-nav-mobile-cta">
              <ThemeToggle />
              <button className="landing-btn landing-btn-ghost" onClick={() => navTo('/auth/login')}>Log in</button>
              <button className="landing-btn landing-btn-primary" onClick={() => navTo('/auth/register')}>Get started <ArrowRight size={16} /></button>
            </div>
          </nav>
          <div className="landing-nav-actions">
            <ThemeToggle />
            <button className="landing-btn landing-btn-ghost" onClick={() => navTo('/auth/login')}>Log in</button>
            <button className="landing-btn landing-btn-primary" onClick={() => navTo('/auth/register')}>Get started <ArrowRight size={16} /></button>
            <button className="landing-menu-toggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={menuOpen}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-grid-bg" />
          <div className="hero-glow one" />
          <div className="hero-glow two" />
          <div className="landing-container hero-inner">
            <div>
              <Reveal>
                <span className="hero-badge"><span className="lp-pulse-dot" /> Public procurement, modernized</span>
                <h1 className="hero-title">Procurement that moves at the <span className="lp-gradient-text">speed of trust.</span></h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="hero-sub">TenderBridge is the end-to-end platform for publishing, bidding, comparing, and awarding tenders - with encrypted bids, automated evaluation, and an unbreakable audit trail.</p>
              </Reveal>
              <Reveal delay={220}>
                <div className="hero-actions">
                  <button className="landing-btn landing-btn-primary" onClick={() => goSection('tenders')}>Explore live tenders <ArrowRight size={16} /></button>
                  <button className="landing-btn landing-btn-ghost" onClick={() => navTo('/auth/register')}><UserCheck size={16} /> Create contractor profile</button>
                </div>
                <ul className="hero-checks">
                  <li><CheckCircle2 size={16} /> Free to browse</li>
                  <li><ShieldCheck size={16} /> Verified pipeline</li>
                  <li><Zap size={16} /> Instant comparisons</li>
                </ul>
              </Reveal>
            </div>

            <Reveal delay={180} className="hero-demo-wrap">
              <div className="hero-demo">
                <div className="demo-top">
                  <span className="demo-dot red" />
                  <span className="demo-dot amber" />
                  <span className="demo-dot green" />
                  <span className="demo-url">tenderbridge.portal</span>
                </div>
                <div className="demo-body">
                  <div className="demo-panel">
                    <div className="demo-panel-label">Bid comparison</div>
                    <div className="demo-bars">
                      <div className="bar" style={{ '--h': '38%' }} />
                      <div className="bar" style={{ '--h': '58%' }} />
                      <div className="bar" style={{ '--h': '46%' }} />
                      <div className="bar" style={{ '--h': '76%' }} />
                      <div className="bar is-best" style={{ '--h': '92%' }} />
                      <div className="bar" style={{ '--h': '64%' }} />
                    </div>
                  </div>
                  <div className="demo-panel">
                    <div className="demo-panel-label">Live tenders</div>
                    {tenders.slice(0, 3).map((t) => (
                      <div className="demo-row" key={t.id}>
                        <span className="demo-row-dot" />
                        <span className="demo-row-title">{t.title}</span>
                        <span className="demo-row-budget">{money(t.estimatedBudget)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="demo-panel demo-panel-card">
                    <div>
                      <div className="demo-panel-label">Composite score</div>
                      <span className="demo-score">94<span className="demo-score-unit">/100</span></span>
                    </div>
                    <span className="demo-award"><Award size={13} /> Ready to award</span>
                  </div>
                </div>
              </div>
              <div className="hero-demo-glow" />
            </Reveal>
          </div>

          <div className="landing-container hero-stats">
            {[
              { v: '65%', l: 'faster bid evaluations' },
              { v: '100%', l: 'encrypted submissions' },
              { v: '120+', l: 'verified contractors' },
              { v: '24/7', l: 'AI assistant' },
            ].map((s) => (
              <div className="hero-stat" key={s.l}>
                <span className="hero-stat-value">{s.v}</span>
                <span className="hero-stat-label">{s.l}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-trust" aria-label="Trusted by leading organizations">
          <div className="landing-container">
            <div className="trust-label">Trusted by public & private teams</div>
            <div className="marquee">
              <div className="marquee-track">
                {[...TRUSTED_BY, ...TRUSTED_BY].map((name, i) => (
                  <span className="marquee-item" key={`${name}-${i}`}><Building2 size={15} /> {name}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-container">
            <Reveal className="section-head">
              <span className="section-eyebrow"><Sparkles size={15} /> Everything you need</span>
              <h2 className="section-title">A complete toolkit for <span className="lp-gradient-text">fair procurement</span></h2>
              <p className="section-sub">From announcement to award, every step is structured, secure, and auditable - so teams stay compliant while moving faster.</p>
            </Reveal>
            <div className="features-grid">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 90}>
                  <div className="feature-card">
                    <div className="feature-icon"><f.icon size={21} /></div>
                    <h3 className="feature-title">{f.title}</h3>
                    <p className="feature-desc">{f.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-section">
          <div className="landing-container">
            <Reveal className="section-head">
              <span className="section-eyebrow"><TrendingUp size={15} /> Simple workflow</span>
              <h2 className="section-title">From brief to award in <span className="lp-gradient-text">four steps</span></h2>
            </Reveal>
            <div className="steps-grid">
              {STEPS.map((s, i) => (
                <Reveal key={s.step} delay={i * 90}>
                  <div className="step-card">
                    <div className="step-num">{s.step}</div>
                    <div className="step-icon"><s.icon size={19} /></div>
                    <h3 className="step-title">{s.title}</h3>
                    <p className="step-desc">{s.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="tenders" className="landing-section landing-tenders">
          <div className="landing-container">
            <Reveal className="section-head">
              <span className="section-eyebrow"><TrendingUp size={15} /> Live opportunities</span>
              <h2 className="section-title">Tenders open <span className="lp-gradient-text">right now</span></h2>
              <p className="section-sub">Browse real, published opportunities without an account. Login is only needed to place a bid.</p>
            </Reveal>
            {tendersLoading ? (
              <p className="tenders-loading">Loading opportunities...</p>
            ) : (
              <div className="tenders-grid">
                {visibleTenders.map((t) => {
                  const meta = statusMeta(t.status);
                  return (
                    <article className="tender-card" key={t.id}>
                      <div className="tender-top">
                        <span className="tender-cat">{t.category}</span>
                        <span className={`tender-status ${meta.className}`}>{meta.label}</span>
                      </div>
                      <h3 className="tender-title">{t.title}</h3>
                      <p className="tender-desc">{t.description}</p>
                      <div className="tender-meta">
                        <span className="tender-budget">{money(t.estimatedBudget)}</span>
                        <span className="tender-deadline"><Clock size={13} /> {daysLeft(t.deadline)}d left</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {!tendersLoading && visibleTenders.length === 0 && (
              <p className="tenders-loading">No open tenders right now - check back soon.</p>
            )}
            <div className="tenders-more">
              <button className="landing-btn landing-btn-ghost" onClick={() => navTo('/auth/login')}>
                Unlock the full portal <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        <section id="testimonials" className="landing-section">
          <div className="landing-container">
            <Reveal className="section-head">
              <span className="section-eyebrow"><Star size={15} /> Testimonials</span>
              <h2 className="section-title">Teams that <span className="lp-gradient-text">trusted the process</span></h2>
            </Reveal>
            <div className="testimonials-grid">
              {TESTIMONIALS.map((t, i) => (
                <Reveal key={t.name} delay={i * 90}>
                  <figure className="t-card">
                    <div className="t-stars">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={15} fill="currentColor" />)}</div>
                    <blockquote className="t-quote">&ldquo;{t.quote}&rdquo;</blockquote>
                    <figcaption className="t-person">
                      <span className="t-avatar">{t.name.charAt(0)}</span>
                      <div>
                        <div className="t-name">{t.name}</div>
                        <div className="t-role">{t.role}</div>
                      </div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-cta">
          <div className="landing-container">
            <Reveal>
              <div className="cta-panel">
                <h2 className="cta-title">Ready to bridge the <span className="lp-gradient-text">gap between issuers and builders?</span></h2>
                <p className="cta-sub">Join the network of public authorities and verified contractors already cutting evaluation time in half.</p>
                <div className="cta-actions">
                  <button className="landing-btn landing-btn-primary" onClick={() => navTo('/auth/register')}>Create free contractor profile <ArrowRight size={16} /></button>
                  <button className="landing-btn landing-btn-ghost" onClick={() => navTo('/auth/login')}>Log in</button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-grid">
            <div className="footer-brand">
              <button className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <span className="landing-logo-mark"><Landmark size={19} strokeWidth={2.2} /></span>
                <span className="landing-logo-text">Tender<span>Bridge</span></span>
              </button>
              <p>A modern procurement platform automating tender publishing, encrypted bidding, comparison, and award - with a complete audit trail.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <button onClick={() => goSection('features')}>Features</button>
              <button onClick={() => goSection('how-it-works')}>How it works</button>
              <button onClick={() => goSection('tenders')}>Live tenders</button>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <button onClick={() => navTo('/auth/login')}>Log in</button>
              <button onClick={() => navTo('/auth/register')}>Create profile</button>
              <button onClick={() => navTo('/portal/dashboard')}>Portal</button>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <button onClick={() => goSection('testimonials')}>Testimonials</button>
              <button onClick={() => goSection('features')}>Security</button>
              <button onClick={() => goSection('how-it-works')}>Documentation</button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} TenderBridge. All rights reserved.</span>
            <span>Built for transparent public procurement.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
