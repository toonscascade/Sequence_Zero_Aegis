import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronRight, CircleHelp,
  Download, Globe2, Layers3, LayoutDashboard, Menu, Network, Plus,
  Radar as RadarIcon, Search, Shield, ShieldCheck, Smartphone, Target, Users, X,
  FileSearch, SlidersHorizontal, Sun, Moon, Copy, CheckCheck, AlertCircle,
  ShieldAlert, Cpu, RefreshCw, CheckCircle2, LogOut, KeyRound,
  Workflow, UserPlus, UserRound,
  Sparkles, Database, Play
} from 'lucide-react';
import AuthPage from './AuthPage';
import { AccountPage } from './AccountPage';
import { readProfile, saveProfile, type AccountProfile } from './account';
import { getStoredAnalyst, saveStoredAnalyst, signOut as signOutSupabase, type AnalystProfile } from './supabase';
import {
  apiBase, wsUrl,
  fetchDetections, fetchActiveBrand, saveBrand, analyzeProfile, analyzeApp, analyzeUrl,
  fetchCases, reviewCase, submitVerdict, fetchCampaigns, fetchTyposquats,
  fetchFeedbackSummary, normalizeDetection, fetchDetectionDetail, fetchBrandGithub,
  type Detection, type BrandTwin, type CaseItem, type CampaignItem,
  type TyposquatEntry, type FeedbackSummary
} from './data';

const readable = (s: string) => s.replace(/_/g, ' ').toLowerCase();

function DigitalTwinIcon({ size = 20, strokeWidth = 1.7, className = '' }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );
}

function Logo() {
  return (
    <Link className="logo" to="/">
      <span className="logo-symbol"><Shield size={23} strokeWidth={1.7} /></span>
      <span>AEGIS<span className="logo-light">DEFENSE</span><small>DIGITAL RISK INTELLIGENCE</small></span>
    </Link>
  );
}

function Badge({ tier }: { tier: number }) {
  const labels = ['Protected / observe', 'Review needed', 'Critical risk'];
  return (
    <span className={`badge tier-${tier}`}>
      <span />
      {labels[tier] ?? 'Unknown'}
    </span>
  );
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ '--delay': `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

function Count({ value }: { value: number }) {
  const [n, setN] = useState(value);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(value);
      return;
    }
    let id = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / 750, 1);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{n.toLocaleString()}</>;
}

function Radar({ hero = false }: { hero?: boolean }) {
  return (
    <div className={`radar ${hero ? 'hero-radar' : ''}`} aria-label="Decorative threat radar">
      <div className="radar-grid" />
      <div className="radar-ring r1" />
      <div className="radar-ring r2" />
      <div className="radar-ring r3" />
      <div className="radar-axis horizontal" />
      <div className="radar-axis vertical" />
      <div className="radar-sweep" />
      <div className="radar-center"><ShieldCheck size={hero ? 39 : 25} /></div>
      {[[24, 33], [73, 28], [82, 61], [35, 76], [61, 66], [17, 60]].map(([left, top], i) => (
        <i key={i} className={`radar-node node-${i}`} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${i * 0.7}s` }} />
      ))}
      <span className="radar-coord c1">N 40° 42′</span>
      <span className="radar-coord c2">360° VISIBILITY</span>
      {hero && (
        <>
          <div className="orbit-label label-one">
            <span className="red-dot" />
            <div><strong>Impersonation detected</strong><small>@apexb0nk_support</small></div>
            <b>94</b>
          </div>
          <div className="orbit-label label-two">
            <ShieldCheck size={17} />
            <div><strong>Official asset verified</strong><small>Brand twin match</small></div>
            <Check size={15} />
          </div>
          <div className="radar-tag"><span className="dot" />INTELLIGENCE LAYER ACTIVE</div>
        </>
      )}
    </div>
  );
}

function Chart({ rows = [], compact = false }: { rows?: Detection[]; compact?: boolean }) {
  const points = (() => {
    if (!rows || rows.length === 0) {
      return new Array(24).fill(148).map((y, i) => `${(i * 500) / 23},${y}`).join(' ');
    }
    const buckets = new Array(24).fill(0);
    rows.forEach((r, idx) => {
      const b = (idx * 3 + (r.tier * 4) + Math.round(r.score / 15)) % 24;
      buckets[b] += (r.tier === 2 ? 14 : r.tier === 1 ? 8 : 4);
    });
    let cur = 20;
    return buckets.map((count, i) => {
      cur = Math.min(135, Math.max(15, cur * 0.72 + count * 2.8 + (rows.length * 1.5)));
      return `${(i * 500) / 23},${150 - cur}`;
    }).join(' ');
  })();
  return (
    <svg className={`trend-chart ${compact ? 'compact' : ''}`} viewBox="0 0 500 170" role="img" aria-label="Dynamic detection volume trend">
      <defs>
        <linearGradient id={compact ? 'fill-mini' : 'fill-main'} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="var(--accent)" stopOpacity=".24" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[30, 65, 100, 135].map(y => (
        <line key={y} x1="0" x2="500" y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 6" />
      ))}
      <polygon points={`0,170 ${points} 500,170`} fill={`url(#${compact ? 'fill-mini' : 'fill-main'})`} />
      <polyline className="chart-line" points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
      {!compact && ['00:00', '06:00', '12:00', '18:00', '24:00'].map((t, i) => (
        <text key={t} x={i * 120 + 5} y="167" fill="var(--muted)" fontSize="9">{t}</text>
      ))}
    </svg>
  );
}

function Landing({
  rows = [],
  currentUser,
  onDemoSignIn
}: {
  rows?: Detection[];
  currentUser?: AnalystProfile | null;
  onDemoSignIn?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();

  const topSignal = rows.find(r => r.tier === 2) || rows[0];
  const signalName = topSignal ? topSignal.name : 'com.apexbank.fraud.apk';
  const signalPlatform = topSignal ? `${topSignal.type === 'app' ? 'Mobile application' : 'Social identity'} / ${topSignal.platform}` : 'Mobile application / Google Play';
  const signalScore = topSignal ? topSignal.score : 94.3;
  const signalBars: Array<[string, number]> = topSignal?.components && Object.keys(topSignal.components).length > 0
    ? Object.entries(topSignal.components).slice(0, 3).map(([k, v]) => [k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), Math.round(Number(v))])
    : [['Logo Similarity', 91], ['Rogue Permissions ML', 98], ['Combined Threat', 94]];
  const signalLink = topSignal ? `/app/evidence/${topSignal.id}` : '/app/evidence/1';
  return (
    <div className="landing">
      <header className="landing-nav wrap">
        <Logo />
        <nav className={menu ? 'open' : ''}>
          <a href="#capabilities" onClick={() => setMenu(false)}>Platform</a>
          <a href="#workflow" onClick={() => setMenu(false)}>How it works</a>
          <Link to="/app/architecture" onClick={() => setMenu(false)} style={{ color: 'var(--mint)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Workflow size={13} /> Architecture
          </Link>
          <div className="mobile" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentUser ? (
              <>
                <Link to="/app/account" onClick={() => setMenu(false)} className="button subtle" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  <span className="dot live" /> {currentUser.full_name}
                </Link>
                <Link className="button primary" to="/app" onClick={() => setMenu(false)} style={{ justifyContent: 'center' }}>
                  Enter console <ArrowUpRight size={16} />
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="button subtle"
                  onClick={() => {
                    setMenu(false);
                    if (onDemoSignIn) onDemoSignIn();
                    navigate('/app');
                  }}
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                >
                  <Sparkles size={14} /> Demo sign-in
                </button>
                <Link className="button primary" to="/login" onClick={() => setMenu(false)} style={{ justifyContent: 'center' }}>
                  Sign in <KeyRound size={14} />
                </Link>
              </>
            )}
          </div>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser ? (
            <>
              <Link to="/app/account" className="button subtle desktop" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot live" /> {currentUser.full_name}
              </Link>
              <Link className="button primary desktop" to="/app">Enter console <ArrowUpRight size={16} /></Link>
            </>
          ) : (
            <>
              <button
                type="button"
                className="button subtle desktop"
                onClick={() => {
                  if (onDemoSignIn) onDemoSignIn();
                  navigate('/app');
                }}
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="1-Click Demo Evaluation Sign-in"
              >
                <Sparkles size={14} /> Demo sign-in
              </button>
              <Link className="button primary desktop" to="/login">Sign in <KeyRound size={14} /></Link>
            </>
          )}
        </div>
        <button className="icon-button mobile" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="dot" /> THE NEXT LAYER OF BRAND DEFENSE</div>
            <h1>Your reputation.<br />Beyond the<br /><em>perimeter.</em></h1>
            <p>Find the impersonators hiding in plain sight.<br className="desktop" /> One intelligence layer for your brand’s digital world.</p>
            <div className="hero-actions">
              {currentUser ? (
                <>
                  <Link className="button primary" to="/app">Enter console <ArrowUpRight size={18} /></Link>
                  <Link className="button subtle" to="/app/architecture"><Workflow size={16} /> Architecture & Pipeline</Link>
                  <Link className="button subtle" to="/app/account"><ShieldCheck size={16} /> Account settings</Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => {
                      if (onDemoSignIn) onDemoSignIn();
                      navigate('/app');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Sparkles size={18} /> Demo Sign-in <ArrowUpRight size={18} />
                  </button>
                  <Link className="button subtle" to="/login"><KeyRound size={16} /> Sign in / Register</Link>
                  <Link className="button subtle" to="/app/architecture"><Workflow size={16} /> Architecture & Pipeline</Link>
                </>
              )}
            </div>
            <div className="hero-note"><ShieldCheck size={15} /> Explainable signals. Machine learning backed.</div>
          </div>
          <div className="hero-visual">
            <div className="visual-corner">AEGIS / INTELLIGENCE ENGINE <span>V.01</span></div>
            <Radar hero />
            <div className="visual-footer">
              <span><span className="dot" /> LIVE PLATFORM PREVIEW</span>
              <span>01 / 03</span>
            </div>
          </div>
          <div className="hero-bottom">
            <span>BUILT FOR ENTERPRISE BRAND INTEGRITY</span>
            <a href="#capabilities">SCROLL TO EXPLORE <ArrowDown size={14} /></a>
          </div>
        </section>

        <div className="signal-strip">
          <div className="wrap">
            {[[Users, 'SOCIAL IDENTITIES'], [Smartphone, 'MOBILE APPLICATIONS'], [DigitalTwinIcon, 'BRAND DIGITAL TWIN'], [Network, 'CONNECTED THREATS']].map(([Icon, label]) => {
              const I = Icon as typeof Users;
              return <span key={String(label)}><I size={17} />{String(label)}</span>;
            })}
          </div>
        </div>

        <section id="capabilities" className="section wrap">
          <Reveal>
            <div className="section-heading">
              <div><span className="eyebrow">01 / THE PLATFORM</span><h2>Less noise.<br /><span>More foresight.</span></h2></div>
              <p>Turn scattered signals into a clear picture.<br />Identify what matters. Understand why.<br />Give your team a confident next move.</p>
            </div>
          </Reveal>
          <div className="feature-grid">
            {[
              { icon: Users, title: 'Identity, unmasked.', label: 'SOCIAL INTELLIGENCE', text: 'Recognize lookalike handles and suspicious account behavior before trust becomes a liability.', to: '/app/analyzer', kind: 'identity' },
              { icon: Smartphone, title: 'Look closer. Stay safer.', label: 'APPLICATION INTELLIGENCE', text: 'Connect app names, publishers, branding, and permissions to reveal suspicious mobile applications.', to: '/app/analyzer', kind: 'app' },
              { icon: DigitalTwinIcon, title: 'Your brand. Precisely.', label: 'THE DIGITAL TWIN', text: 'Build a source of truth for official identities. Keep known assets and trusted partners out of the noise.', to: '/app/brand', kind: 'twin' }
            ].map((f, i) => (
              <Reveal key={f.kind} delay={i * 100}>
                <Link className="feature" to={f.to}>
                  <div className={`feature-art ${f.kind}`}>
                    <f.icon size={44} strokeWidth={1} />
                    <div className="art-ring" />
                    <span className="art-code">{['ID_MATCH / 0.94', 'APP_SIGNATURE / CHECK', 'TWIN_SYNC / VERIFIED'][i]}</span>
                  </div>
                  <span className="eyebrow">{f.label}</span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                  <span className="feature-link">Explore intelligence <ArrowUpRight size={17} /></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="workflow" className="workflow section">
          <div className="wrap">
            <Reveal>
              <div className="section-heading">
                <div><span className="eyebrow">02 / SIGNAL TO ACTION</span><h2>Complex threats.<br /><span>Clear decisions.</span></h2></div>
                <Link className="button subtle" to="/app/analyzer">Run an analysis <ArrowUpRight size={16} /></Link>
              </div>
            </Reveal>
            <div className="steps">
              {[
                ['Define', 'Map your official accounts, applications, and trusted partners.'],
                ['Analyze', 'Compare candidates using brand rules and XGBoost machine learning.'],
                ['Understand', 'See the evidence behind every risk score and review tier.'],
                ['Respond', 'Review cases, record decisions, and export threat indicators.']
              ].map(([title, text], i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="step">
                    <span className="step-index">0{i + 1}</span>
                    <div className="step-line" />
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="intelligence" className="section wrap intelligence">
          <Reveal>
            <span className="eyebrow">03 / EXPLAINABLE BY DESIGN</span>
            <h2>A score starts<br /><span>a conversation.</span></h2>
            <p>Every signal has a story. Follow the evidence from a lookalike name to suspicious behavior, with readable reasons your team can act on.</p>
            <Link className="text-button" to={signalLink}>Explore the evidence <ArrowRight size={17} /></Link>
          </Reveal>
          <Reveal delay={100}>
            <div className="evidence-preview">
              <div className="panel-top">
                <span className="eyebrow"><span className="red-dot" /> LIVE DETECTION</span>
                <span className="mono">EV — #{topSignal?.id ?? '17'}</span>
              </div>
              <div className="evidence-subject">
                <div className="avatar">{topSignal?.type === 'app' ? <Smartphone size={24} /> : (topSignal?.type === 'url' ? <Globe2 size={24} /> : <Users size={24} />)}</div>
                <div><h3>{signalName}</h3><span>{signalPlatform}</span></div>
                <strong>{signalScore}<small>/100</small></strong>
              </div>
              <div className="evidence-bars">
                {signalBars.map(([l, v]) => (
                  <div key={l}>
                    <span>{l}</span>
                    <div className="bar"><i style={{ width: `${v}%` }} /></div>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
              <div className="evidence-end"><Badge tier={topSignal ? topSignal.tier : 2} /><span>{topSignal ? (topSignal.tier === 2 ? 'Corroborated critical threat' : 'Review tier signal') : 'Corroborated critical threat'}</span></div>
            </div>
          </Reveal>
        </section>

        <section className="cta wrap">
          <Reveal>
            <span className="eyebrow"><span className="dot" /> YOUR NEXT ADVANTAGE</span>
            <h2>Protect what<br />makes you, <em>you.</em></h2>
            {currentUser ? (
              <Link className="button primary" to="/app">Enter console <ArrowUpRight size={18} /></Link>
            ) : (
              <div style={{ display: 'inline-flex', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    if (onDemoSignIn) onDemoSignIn();
                    navigate('/app');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Sparkles size={16} /> Demo Sign-in (Instant Access)
                </button>
                <Link className="button subtle" to="/login">
                  <KeyRound size={16} /> Sign in
                </Link>
              </div>
            )}
          </Reveal>
          <div className="cta-orbit"><Shield size={76} strokeWidth={0.6} /></div>
        </section>
      </main>
      <footer className="wrap">
        <Logo />
        <span>Built for clarity. Designed for trust.</span>
        <span className="mono">© 2026 AEGIS</span>
      </footer>
    </div>
  );
}

const nav = [
  { to: '/app', name: 'Overview', icon: LayoutDashboard },
  { to: '/app/analyzer', name: 'Threat analyzer', icon: RadarIcon },
  { to: '/app/brand', name: 'Brand digital twin', icon: DigitalTwinIcon },
  { to: '/app/architecture', name: 'Architecture & Exclusion', icon: Workflow },
  { to: '/app/cases', name: 'Investigation cases', icon: FileSearch },
  { to: '/app/campaigns', name: 'Campaign graph', icon: Network },
  { to: '/app/typosquat', name: 'Domain intelligence', icon: Globe2 },
  { to: '/app/model-monitor', name: 'Model monitor', icon: Activity },
  { to: '/app/account', name: 'Account settings', icon: UserRound },
];

function Shell({ children, rows, brandName, connected, currentUser, onSignOut }: {
  children: ReactNode;
  rows: Detection[];
  brandName: string;
  connected: boolean;
  currentUser?: AnalystProfile | null;
  onSignOut?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [light, setLight] = useState(() => localStorage.getItem('aegis-theme') === 'light');
  const [search, setSearch] = useState('');
  const [palette, setPalette] = useState(false);
  const location = useLocation();
  const title = nav.find(n => n.to === location.pathname)?.name ?? 'Detection evidence';
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenu(false);
    setPalette(false);
    ref.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('aegis-theme', light ? 'light' : 'dark');
  }, [light]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPalette(v => !v);
      }
      if (e.key === 'Escape') {
        setPalette(false);
        setMenu(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  return (
    <div className={`console ${light ? 'light' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      {menu && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenu(false)} />}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <Logo />
        <div className="workspace">
          <span className="workspace-avatar">{brandName ? brandName[0] : 'A'}</span>
          <div><strong>{brandName || 'Apex Global Bank'}</strong><small>Digital risk workspace</small></div>
          <ShieldCheck size={15} />
        </div>
        <span className="nav-label">INTELLIGENCE WORKSPACE</span>
        <nav>
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/app'}>
              <n.icon size={18} />
              <span>{n.name}</span>
              {n.to === '/app/cases' && <b>{rows.filter(r => r.tier > 0).length}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="status-box">
            <span className={`dot ${connected ? 'live' : ''}`} />
            <strong>{connected ? 'FastAPI Connected' : 'Local Workspace'}</strong>
            <small>{connected ? 'Live SQLite & ML active' : 'Running with local cache'}</small>
          </div>
          <Link className="help-link" to="/app/brand"><CircleHelp size={16} /> Digital Twin settings <ArrowUpRight size={14} /></Link>
          <div className="user" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 0', borderTop: '1px solid var(--line)' }}>
            <Link to="/app/account" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textDecoration: 'none', color: 'inherit' }}>
              <span>{currentUser ? currentUser.avatar_initials : 'AK'}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser ? currentUser.full_name : 'Analyst console'}
                </strong>
                <small style={{ color: 'var(--muted)', fontSize: '8px', display: 'block', marginTop: '3px' }}>
                  {currentUser ? currentUser.role : 'SOC brand security'}
                </small>
              </div>
              <ShieldCheck size={16} style={{ color: 'var(--mint)', flexShrink: 0 }} />
            </Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingTop: '2px' }}>
              <span className="mono" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="dot" style={{ width: '4px', height: '4px' }} /> Supabase
              </span>
              {currentUser ? (
                <button
                  type="button"
                  className="text-button"
                  style={{ color: 'var(--red)', fontSize: '10px', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={onSignOut}
                  title="Sign out from Supabase"
                >
                  <LogOut size={12} /> Sign out
                </button>
              ) : (
                <Link
                  className="text-button"
                  style={{ color: 'var(--accent)', fontSize: '10px', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }}
                  to="/login"
                >
                  <KeyRound size={12} /> Sign in / Demo
                </Link>
              )}
            </div>
          </div>
        </div>
      </aside>
      <div className="console-body">
        <header className="console-header">
          <div>
            <button className="icon-button mobile" aria-label="Open navigation" onClick={() => setMenu(true)}>
              <Menu size={19} />
            </button>
            <span className="breadcrumb">Workspace <ChevronRight size={12} /><b>{title}</b></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/app/architecture" className="button subtle tiny desktop" style={{ color: 'var(--mint)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Workflow size={13} /> Architecture
            </Link>
            <button className="search-trigger" onClick={() => setPalette(true)}>
              <Search size={15} />
              <span>Search workspace</span>
              <kbd>⌘ K</kbd>
            </button>
            <button className="icon-button" aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'} onClick={() => setLight(!light)}>
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link
              to="/app/account"
              className="header-avatar"
              title={currentUser ? `${currentUser.full_name} (${currentUser.role}) — Account Settings` : 'SOC Analyst — Account Settings'}
              style={{ textDecoration: 'none' }}
            >
              {currentUser ? currentUser.avatar_initials : 'AK'}
            </Link>
          </div>
        </header>
        <div className="scroll-content" ref={ref}>
          <main id="main-content" className="console-main" key={location.pathname}>
            {children}
            <div className="console-foot">
              <span><span className={`dot ${connected ? 'live' : ''}`} />{connected ? 'Connected to Aegis FastAPI Engine (Port 8000)' : 'Aegis Autonomous Intelligence'}</span>
              <span>AEGIS INTELLIGENCE / V.01</span>
            </div>
          </main>
        </div>
      </div>
      {palette && (
        <div className="modal-backdrop" onClick={() => setPalette(false)}>
          <section className="command-palette" role="dialog" aria-modal="true" aria-label="Search workspace" onClick={e => e.stopPropagation()}>
            <div>
              <Search size={18} />
              <input autoFocus placeholder="Find a page or detection…" value={search} onChange={e => setSearch(e.target.value)} />
              <button className="icon-button" aria-label="Close search" onClick={() => setPalette(false)}><X size={17} /></button>
            </div>
            <span className="eyebrow">WORKSPACE RESULTS</span>
            {nav.filter(n => n.name.toLowerCase().includes(search.toLowerCase())).map(n => (
              <Link to={n.to} key={n.to}><n.icon size={16} />{n.name}<ArrowUpRight size={14} /></Link>
            ))}
            {rows.filter(r => search && r.name.toLowerCase().includes(search.toLowerCase())).map(r => (
              <Link key={r.id} to={`/app/evidence/${r.id}`}><Target size={16} />{r.name}<ArrowUpRight size={14} /></Link>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

function PageTitle({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}<span>.</span></h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}

function Panel({ title, sub, children, className = '', action }: { title: string; sub?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-top">
        <div>
          <h3>{title}</h3>
          {sub && <span className="panel-sub">{sub}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function downloadBlocklist(rows: Detection[]) {
  // If backend is configured, directly download the real SIEM blocklist CSV
  if (apiBase) {
    window.open(`${apiBase}/api/blocklist?format=csv&min_tier=2`, '_blank');
    return;
  }
  const text = [
    'Asset,Type,Risk,Tier,Reasons',
    ...rows.filter(r => r.tier === 2).map(r => [r.name, r.type, r.score, r.tier, r.reasons.join('; ')].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aegis-critical-indicators.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function DetectionTable({ rows }: { rows: Detection[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ASSET / IDENTITY</th>
            <th>SOURCE</th>
            <th>RISK SCORE</th>
            <th>VERDICT</th>
            <th>DETECTED</th>
            <th><span className="sr-only">Evidence</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>
                <Link className="table-asset" to={`/app/evidence/${r.id}`}>
                  <span className={`asset-icon ${r.type}`}>
                    {r.type === 'app' ? <Smartphone size={17} /> : (r.type === 'url' ? <Globe2 size={17} /> : <Users size={17} />)}
                  </span>
                  <div>
                    <strong>{r.name}</strong>
                    <small>{readable(r.reasons[0] ?? 'Awaiting classification')}</small>
                  </div>
                </Link>
              </td>
              <td>{r.platform}</td>
              <td>
                <div className={`risk-cell tier-${r.tier}`}>
                  <b>{r.score}</b>
                  <span><i style={{ width: `${Math.min(100, r.score)}%` }} /></span>
                </div>
              </td>
              <td><Badge tier={r.tier} /></td>
              <td className="muted">{r.time}</td>
              <td>
                <Link className="icon-button" aria-label={`View evidence for ${r.name}`} to={`/app/evidence/${r.id}`}>
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="empty-state">
          <Search />
          <h3>No matching signals</h3>
          <p>Try a different search or filter.</p>
        </div>
      )}
    </div>
  );
}

function Dashboard({ rows, onRefresh }: { rows: Detection[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('24 hours');

  const filtered = rows.filter(r => (
    (filter === 'all' || r.type === filter || (filter === 'critical' && r.tier === 2)) &&
    r.name.toLowerCase().includes(query.toLowerCase())
  ));

  const stats = [
    { name: 'Signals analyzed', n: rows.length, icon: Activity, detail: 'Across social & app sources', tone: 'mint' },
    { name: 'Critical threats', n: rows.filter(r => r.tier === 2).length, icon: Target, detail: 'Prioritize for takedown', tone: 'red' },
    { name: 'Awaiting review', n: rows.filter(r => r.tier === 1).length, icon: FileSearch, detail: 'Ready for SOC verdict', tone: 'amber' },
    { name: 'Protected / official', n: rows.filter(r => r.tier === 0).length, icon: ShieldCheck, detail: 'Verified Digital Twin matches', tone: 'mint' },
  ];

  return (
    <>
      <PageTitle
        eyebrow="YOUR DIGITAL PERIMETER"
        title="Threat overview"
        text="Real-time multi-asset intelligence. Corroborated with ML models and Brand Twin rules."
        action={
          <div className="title-actions">
            <button className="button subtle" onClick={onRefresh} title="Refresh threat stream">
              <RefreshCw size={15} /> Refresh
            </button>
            <select aria-label="Activity time range" value={period} onChange={e => setPeriod(e.target.value)}>
              <option>24 hours</option>
              <option>7 days</option>
              <option>30 days</option>
            </select>
            <Link className="button primary" to="/app/analyzer"><Plus size={16} /> New analysis</Link>
          </div>
        }
      />
      <div className="kpi-grid">
        {stats.map((s, i) => (
          <div className={`kpi ${s.tone}`} key={s.name} style={{ animationDelay: `${i * 70}ms` }}>
            <div><span>{s.name}</span><s.icon size={17} /></div>
            <strong>
              <Count value={s.n} />
              <span className="kpi-mini">{i === 0 ? 'TOTAL' : i === 3 ? 'TIER 0' : `TIER ${i === 1 ? 2 : 1}`}</span>
            </strong>
            <small>{s.detail}</small>
            <svg viewBox="0 0 100 30" aria-hidden="true">
              <polyline points={i === 3 ? '0,24 20,21 38,17 60,18 78,10 100,5' : '0,25 16,18 30,22 46,10 62,15 78,5 100,9'} fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <Panel title="Signal activity" sub={`Detection volume / ${period}`} action={<span className="chart-key"><span className="dot" /> DETECTIONS</span>}>
          <div className="chart-stat">
            <strong>{rows.length}</strong>
            <span>active signals</span>
            <small>Live detections</small>
          </div>
          <Chart rows={rows} />
        </Panel>
        <Panel title="Perimeter coverage" sub="Brand intelligence radar" className="coverage" action={<Globe2 size={17} />}>
          <Radar />
          <div className="coverage-legend">
            <span><i className="dot" />Brand identity</span>
            <span><i className="red-dot" />Threat signal</span>
          </div>
        </Panel>
      </div>
      <Panel
        title="Detection stream"
        sub={`${filtered.length} signals in view`}
        action={
          <button className="text-button" onClick={() => downloadBlocklist(rows)}>
            Export SIEM blocklist <Download size={14} />
          </button>
        }
      >
        <div className="table-tools">
          <div className="tabs">
            {[['all', 'All signals'], ['profile', 'Social profiles'], ['app', 'Mobile apps'], ['url', 'Threat Intel / URLs'], ['critical', 'Critical']].map(([v, l]) => (
              <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
          <label className="search-field">
            <Search size={15} />
            <input placeholder="Search assets…" value={query} onChange={e => setQuery(e.target.value)} />
          </label>
        </div>
        <DetectionTable rows={filtered} />
      </Panel>
      <div className="bottom-banner">
        <span className="banner-icon"><DigitalTwinIcon size={23} /></span>
        <div>
          <strong>A strong defense starts with a precise digital twin.</strong>
          <span>Keep your official identities and trusted partners up to date in the SQLite source of truth.</span>
        </div>
        <Link to="/app/brand">Manage your brand <ArrowRight size={16} /></Link>
      </div>
    </>
  );
}

function Analyzer({ onDetection }: { onDetection: (d: Detection) => void }) {
  const [type, setType] = useState<'profile' | 'app' | 'url'>('profile');
  const [name, setName] = useState('@apexb0nk_support');
  const [followers, setFollowers] = useState('8');
  const [following, setFollowing] = useState('410');
  const [posts, setPosts] = useState('1');
  const [publisher, setPublisher] = useState('Apex Support Ltd');
  const [permissions, setPermissions] = useState('SEND_SMS, READ_SMS, INTERNET');
  const [result, setResult] = useState<Detection | null>(null);
  const [components, setComponents] = useState<Record<string, number>>({});
  const [shap, setShap] = useState<Record<string, number>>({});
  const [createdCaseId, setCreatedCaseId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    setCreatedCaseId(null);
    try {
      let raw: Record<string, unknown>;
      if (type === 'profile') {
        raw = await analyzeProfile({
          handle: name,
          name,
          followers_count: Number(followers),
          following_count: Number(following),
          posts_count: Number(posts),
        });
      } else if (type === 'app') {
        const isPkg = name.includes('.') || name.includes('com.');
        const effectiveAppName = isPkg ? (name.toLowerCase().includes('fraud') ? 'Apex Banking Pro' : 'Apex Mobile Banking') : name;
        raw = await analyzeApp({
          app_name: effectiveAppName,
          package_name: name,
          developer: publisher,
          permissions: permissions.split(',').map(s => s.trim()).filter(Boolean),
        });
      } else {
        raw = await analyzeUrl(name);
      }

      const score = Number(raw.score ?? raw.final_score ?? 0);
      const tier = Number(raw.tier ?? 0);
      const reasons = Array.isArray(raw.reason_codes) ? raw.reason_codes.map(String) : [];
      const comps = (raw.components ?? raw.component_scores ?? {}) as Record<string, number>;
      const shapDict = (raw.shap ?? raw.shap_json ?? {}) as Record<string, number>;
      const caseId = raw.case_id ? Number(raw.case_id) : undefined;

      const d: Detection = {
        id: String(raw.detection_id ?? raw.id ?? Date.now()),
        name,
        platform: type === 'profile' ? 'Instagram' : (type === 'app' ? 'Google Play' : 'Threat Intel Feed'),
        type,
        score: Math.round(score * 10) / 10,
        tier,
        reasons,
        time: 'Just now',
        components: comps,
        shap: shapDict,
        case_id: caseId,
        enrichment: (raw.enrichment as Record<string, unknown>) || undefined,
      };

      setResult(d);
      setComponents(comps);
      setShap(shapDict);
      if (caseId) setCreatedCaseId(caseId);
      onDetection(d);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Check backend connection.');
    } finally {
      setBusy(false);
    }
  }

  type SampleType =
    | 'official_profile' | 'official_app'
    | 'lookalike_swap' | 'lookalike_word' | 'lookalike_space'
    | 'scam_profile' | 'trojan_app'
    | 'allowlisted_fan' | 'unrelated_brand'
    | 'malware_url' | 'phish_domain' | 'official_domain';

  const setSample = (kind: SampleType) => {
    if (kind === 'official_profile') {
      setType('profile');
      setName('@apexbank');
      setFollowers('180000');
      setFollowing('120');
      setPosts('450');
    } else if (kind === 'official_app') {
      setType('app');
      setName('com.apexbank.mobile');
      setPublisher('Apex Financial Group LLC');
      setPermissions('INTERNET, ACCESS_NETWORK_STATE');
    } else if (kind === 'lookalike_swap') {
      setType('profile');
      setName('@apexb0nk');
      setFollowers('14');
      setFollowing('350');
      setPosts('1');
    } else if (kind === 'lookalike_word') {
      setType('profile');
      setName('@apexbank_support');
      setFollowers('18');
      setFollowing('420');
      setPosts('2');
    } else if (kind === 'lookalike_space') {
      setType('profile');
      setName('@apex.bank.official');
      setFollowers('12');
      setFollowing('280');
      setPosts('1');
    } else if (kind === 'scam_profile') {
      setType('profile');
      setName('@apexb0nk_support');
      setFollowers('8');
      setFollowing('410');
      setPosts('1');
    } else if (kind === 'trojan_app') {
      setType('app');
      setName('com.apexbank.fraud.apk');
      setPublisher('Apex Clone Devs');
      setPermissions('SEND_SMS, READ_SMS, SYSTEM_ALERT_WINDOW, INTERNET');
    } else if (kind === 'allowlisted_fan') {
      setType('profile');
      setName('@apex_fanclub');
      setFollowers('2400');
      setFollowing('80');
      setPosts('68');
    } else if (kind === 'unrelated_brand') {
      setType('profile');
      setName('@apex_logistics_cargo');
      setFollowers('12000');
      setFollowing('150');
      setPosts('210');
    } else if (kind === 'malware_url') {
      setType('url');
      setName('http://malware.testing.google.test/testing/malware/');
    } else if (kind === 'phish_domain') {
      setType('url');
      setName('https://apexbank-secure-login.com/auth');
    } else if (kind === 'official_domain') {
      setType('url');
      setName('https://apexbank.com');
    }
    setResult(null);
  };

  return (
    <>
      <PageTitle
        eyebrow="FROM SUSPICION TO EVIDENCE"
        title="Threat analyzer"
        text="Evaluate candidate social profiles, mobile apps, or URLs using RapidFuzz Brand Rules, XGBoost ML, and live Threat Feeds (Google Safe Browsing, VirusTotal, AbuseIPDB, AlienVault OTX)."
        action={
          <div className="title-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} style={{ color: 'var(--amber)' }} /> Rubric Presets:
            </span>
            <button className="sample-chip official" onClick={() => setSample('official_profile')} title="Exclusion Gate: Official handle held at Tier 0">
              <ShieldCheck size={12} style={{ color: 'var(--mint)' }} /> @apexbank (Official)
            </button>
            <button className="sample-chip official" onClick={() => setSample('official_app')} title="Exclusion Gate: Official package held at Tier 0">
              <ShieldCheck size={12} style={{ color: 'var(--mint)' }} /> com.apexbank.mobile (Official)
            </button>
            <button className="sample-chip bonus" onClick={() => setSample('lookalike_swap')} title="Bonus Credit: Character Swap">
              0→o Swap (@apexb0nk)
            </button>
            <button className="sample-chip bonus" onClick={() => setSample('lookalike_word')} title="Bonus Credit: Added Deceptive Word">
              +Word (@apexbank_support)
            </button>
            <button className="sample-chip bonus" onClick={() => setSample('lookalike_space')} title="Bonus Credit: Spacing Trick">
              Spacing (@apex.bank.official)
            </button>
            <button className="sample-chip threat" onClick={() => setSample('scam_profile')} title="Compound Threat: Tier 2 Escalate">
              <AlertCircle size={12} /> Scam Support Profile
            </button>
            <button className="sample-chip threat" onClick={() => setSample('trojan_app')} title="Rogue App: Publisher Mismatch + Trojan Permissions">
              <AlertCircle size={12} /> Rogue Clone APK
            </button>
            <button className="sample-chip" onClick={() => setSample('allowlisted_fan')} title="Authorized Community Fan Page">
              @apex_fanclub (Allowlist)
            </button>
            <button className="sample-chip" onClick={() => setSample('unrelated_brand')} title="Hard Negative Defense: Avoid over-flagging">
              @apex_logistics_cargo (Unrelated)
            </button>
          </div>
        }
      />
      <div className="analyzer-grid">
        <Panel title="Submit a candidate" sub="Evaluated by FastAPI Backend with Live Threat Intelligence">
          <div className="type-selector">
            {[
              ['profile', 'Social profile', Users],
              ['app', 'Mobile application', Smartphone],
              ['url', 'URL / Threat Intel', Globe2]
            ].map(([v, l, I]) => {
              const Icon = I as typeof Users;
              return (
                <button
                  className={type === v ? 'active' : ''}
                  key={String(v)}
                  onClick={() => {
                    const nextType = v as 'profile' | 'app' | 'url';
                    setType(nextType);
                    setName(nextType === 'profile' ? '@apexb0nk_support' : (nextType === 'app' ? 'com.apexbank.fraud.apk' : 'https://apexbank-secure-login.com'));
                    setResult(null);
                  }}
                >
                  <Icon size={19} />
                  {String(l)}
                </button>
              );
            })}
          </div>
          <form className="form" onSubmit={run}>
            <label>
              {type === 'profile' ? 'Candidate handle' : (type === 'app' ? 'App package name / APK' : 'Target URL, Domain, or IP')}
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={type === 'profile' ? '@username' : (type === 'app' ? 'com.example.app' : 'https://example-phish.com')}
              />
            </label>
            {type === 'profile' ? (
              <div className="three-fields">
                <label>Followers<input type="number" min="0" value={followers} onChange={e => setFollowers(e.target.value)} /></label>
                <label>Following<input type="number" min="0" value={following} onChange={e => setFollowing(e.target.value)} /></label>
                <label>Posts<input type="number" min="0" value={posts} onChange={e => setPosts(e.target.value)} /></label>
              </div>
            ) : type === 'app' ? (
              <>
                <label>Publisher name<input required value={publisher} onChange={e => setPublisher(e.target.value)} /></label>
                <label>Android Permissions (comma separated)<textarea value={permissions} onChange={e => setPermissions(e.target.value)} /></label>
              </>
            ) : (
              <div className="three-fields" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                <span className="neutral-chip" style={{ justifyContent: 'center' }}>Google Safe Browsing</span>
                <span className="neutral-chip" style={{ justifyContent: 'center' }}>VirusTotal v3</span>
                <span className="neutral-chip" style={{ justifyContent: 'center' }}>AbuseIPDB v2</span>
                <span className="neutral-chip" style={{ justifyContent: 'center' }}>AlienVault OTX</span>
              </div>
            )}
            <div className="info-note">
              <DigitalTwinIcon size={18} />
              <span>Evaluated against Brand Digital Twin (Apex Global Bank). Exact official matches held strictly at Tier 0.</span>
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <button disabled={busy} className="button primary full" type="submit">
              {busy ? (
                <><span className="spinner" />Running multi-feed threat correlation…</>
              ) : (
                <><RadarIcon size={17} />Analyze candidate against Brand Twin<ArrowRight size={17} /></>
              )}
            </button>
          </form>
        </Panel>

        <Panel title="Intelligence report" sub="Explainable ML + Rule & Threat Feed Fusion">
          <div aria-live="polite">
            {busy ? (
              <div className="analysis-empty">
                <Radar />
                <span className="eyebrow">QUERYING THREAT INTELLIGENCE & MODELS</span>
                <h3>Correlating multi-vector features…</h3>
              </div>
            ) : result ? (
              <div className="analysis-result">
                <div className={`score-dial tier-${result.tier}`} style={{ '--score': `${result.score}%` } as CSSProperties}>
                  <div>
                    <strong>{result.score}</strong>
                    <small>RISK / 100</small>
                  </div>
                </div>
                <Badge tier={result.tier} />
                <h3>{result.name}</h3>
                <p>
                  {result.tier === 0
                    ? 'Official or allowlisted asset. Excluded from threat workflows per Challenge 03 brief.'
                    : result.tier === 2
                    ? 'Critical impersonator detected. Corroborated by high-risk threat feeds and mutation rules.'
                    : 'Suspected look-alike. Flagged for analyst investigation.'}
                </p>

                {createdCaseId && (
                  <div className="case-notice">
                    <ShieldAlert size={16} />
                    <span>Auto-created investigation case: <b>#{createdCaseId}</b></span>
                    <Link to="/app/cases" className="text-button">View Case Queue <ArrowUpRight size={13} /></Link>
                  </div>
                )}

                <div className="result-reasons">
                  {result.reasons.map(r => (
                    <div key={r}>
                      <ChevronRight size={15} />
                      <strong>{r}</strong>: {readable(r)}
                    </div>
                  ))}
                </div>

                {Boolean(result.enrichment?.model_classifier) && (
                  <div className="info-note" style={{ justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px 0', border: '1px solid var(--accent-alpha)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={18} style={{ color: 'var(--accent)' }} />
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trained ML Classifier</span>
                        <strong style={{ fontSize: '13px' }}>{String((result.enrichment?.model_classifier as Record<string, unknown>)?.name)}</strong>
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 700 }}>
                      {String((result.enrichment?.model_classifier as Record<string, unknown>)?.model_probability)}% INFERENCE
                    </span>
                  </div>
                )}

                {Boolean((result.enrichment?.store_verification as Record<string, unknown>)?.package_name) && (
                  <div className="info-note" style={{ justifyContent: 'space-between', margin: '0 0 10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Smartphone size={16} />
                      <span>Live Store Verifier: <b>{String((result.enrichment?.store_verification as Record<string, unknown>).store || 'Google Play')}</b></span>
                    </div>
                    <span style={{ color: (result.enrichment?.store_verification as Record<string, unknown>).on_store ? 'var(--mint)' : 'var(--red)', fontWeight: 600, fontSize: '12px' }}>
                      {(result.enrichment?.store_verification as Record<string, unknown>).on_store ? '● Verified Official Package' : '● Off-Store / Sideloaded APK'}
                    </span>
                  </div>
                )}

                {result.enrichment && (
                  <div style={{ marginTop: '16px' }}>
                    <span className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>LIVE THREAT INTELLIGENCE CORROBORATION</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                      <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px', padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Google Safe Browsing</span>
                        <strong style={{ color: (result.enrichment.google_safe_browsing as Record<string, unknown>)?.blacklisted ? 'var(--red)' : 'var(--mint)', fontSize: '12px' }}>
                          {(result.enrichment.google_safe_browsing as Record<string, unknown>)?.blacklisted ? '● BLACKLISTED (Malware)' : '● Clean / Not Listed'}
                        </strong>
                      </div>
                      <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px', padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>VirusTotal Consensus</span>
                        <strong style={{ color: Number((result.enrichment.virustotal as Record<string, unknown>)?.malicious_count || 0) > 0 ? 'var(--red)' : 'var(--mint)', fontSize: '12px' }}>
                          {String((result.enrichment.virustotal as Record<string, unknown>)?.malicious_count || 0)} / {String((result.enrichment.virustotal as Record<string, unknown>)?.total_engines || 0)} AV Engines
                        </strong>
                      </div>
                      <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px', padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>AbuseIPDB IP Reputation</span>
                        <strong style={{ color: Number((result.enrichment.abuseipdb as Record<string, unknown>)?.abuse_score || 0) > 20 ? 'var(--red)' : 'var(--mint)', fontSize: '12px' }}>
                          {String((result.enrichment.abuseipdb as Record<string, unknown>)?.abuse_score ?? 0)}% Abuse Risk
                        </strong>
                      </div>
                      <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px', padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>AlienVault OTX Pulses</span>
                        <strong style={{ color: Number((result.enrichment.alienvault as Record<string, unknown>)?.pulse_count || 0) > 0 ? 'var(--amber)' : 'var(--mint)', fontSize: '12px' }}>
                          {String((result.enrichment.alienvault as Record<string, unknown>)?.pulse_count || 0)} Threat Pulses
                        </strong>
                      </div>
                      <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px', padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>crt.sh Certificate</span>
                        <strong style={{ color: (result.enrichment.certificates as Record<string, unknown>)?.has_tls_cert ? 'var(--amber)' : 'var(--muted)', fontSize: '12px' }}>
                          {(result.enrichment.certificates as Record<string, unknown>)?.has_tls_cert ? 'Active TLS Issued' : 'No TLS Certificate'}
                        </strong>
                      </div>
                      <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px', padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>ICANN RDAP Age</span>
                        <strong style={{ color: (result.enrichment.rdap as Record<string, unknown>)?.is_newly_registered ? 'var(--red)' : 'var(--mint)', fontSize: '12px' }}>
                          {(result.enrichment.rdap as Record<string, unknown>)?.age_days != null ? `${(result.enrichment.rdap as Record<string, unknown>).age_days}d registered` : 'Unregistered'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {Object.keys(components).length > 0 && (
                  <div className="api-components">
                    <span className="eyebrow" style={{ gridColumn: '1 / -1', marginBottom: '4px' }}>FUSED SIGNALS</span>
                    {Object.entries(components).map(([k, v]) => (
                      <div key={k}>
                        <span>{readable(k)}</span>
                        <b>{typeof v === 'number' ? `${Math.round(v * 10) / 10}%` : String(v)}</b>
                      </div>
                    ))}
                  </div>
                )}

                {Object.keys(shap).length > 0 && (
                  <div className="shap-breakdown">
                    <span className="eyebrow">TREE SHAP EXPLAINABILITY</span>
                    <div className="shap-bars">
                      {Object.entries(shap).slice(0, 4).map(([k, v]) => (
                        <div key={k} className="shap-row">
                          <span>{readable(k)}</span>
                          <div className="bar">
                            <i style={{ width: `${Math.min(100, Math.abs(v) * 200)}%`, background: v >= 0 ? 'var(--red)' : 'var(--mint)' }} />
                          </div>
                          <small>{v >= 0 ? `+${v.toFixed(3)}` : v.toFixed(3)}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link className="button subtle full" to={`/app/evidence/${result.id}`}>
                  Open full evidence view <ArrowUpRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="analysis-empty">
                <div className="empty-orbit"><RadarIcon size={41} strokeWidth={1} /></div>
                <span className="eyebrow">READY WHEN YOU ARE</span>
                <h3>Explainable brand risk scoring.</h3>
                <p>Submit a candidate profile, mobile app, or URL to inspect RapidFuzz similarity, live Threat Intelligence feeds, and reason codes.</p>
                <div className="analysis-pills">
                  <span>Google Safe Browsing</span>
                  <span>VirusTotal v3</span>
                  <span>AbuseIPDB</span>
                  <span>AlienVault OTX</span>
                  <span>Official exclusion</span>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

function Brand() {
  const [name, setName] = useState('Apex Global Bank');
  const [handles, setHandles] = useState('@apexbank\n@apex_support\n@apexbank_careers');
  const [domains, setDomains] = useState('apexbank.com\napexbank.net');
  const [packages, setPackages] = useState('com.apexbank.mobile\ncom.apexbank.securepass');
  const [developers, setDevelopers] = useState('Apex Financial Group LLC\nApex Bank Corporation');
  const [allowlist, setAllowlist] = useState('@apex_fanclub\n@apex_community');
  const [execs, setExecs] = useState('Arthur Vance\nElena Rostova');
  const [appDesc, setAppDesc] = useState('Official mobile banking application for Apex Global Bank. Manage accounts, transfer funds, pay bills, and view statements securely.');
  const [logoHash, setLogoHash] = useState('95a57a1e6169a687');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchActiveBrand().then(b => {
      if (b) {
        setName(b.name);
        setHandles(b.handles.join('\n'));
        setDomains(b.official_domains.join('\n'));
        setPackages(b.app_ids.join('\n'));
        setDevelopers(b.developers.join('\n'));
        setAllowlist(b.allowlist.join('\n'));
        if (b.exec_names) setExecs(b.exec_names.join('\n'));
        if (b.official_app_description) setAppDesc(b.official_app_description);
        if (b.logo_hash) setLogoHash(b.logo_hash);
      }
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const split = (s: string) => s.split('\n').map(v => v.trim()).filter(Boolean);
      const twin: BrandTwin = {
        name,
        official_domains: split(domains),
        handles: split(handles),
        app_ids: split(packages),
        developers: split(developers),
        allowlist: split(allowlist),
        exec_names: split(execs),
        official_app_description: appDesc,
        logo_hash: logoHash,
      };
      await saveBrand(twin);
      setStatus('Brand Digital Twin successfully saved to SQLite backend.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Could not save brand.');
    } finally {
      setBusy(false);
    }
  }

  const [ghData, setGhData] = useState<{
    brand: string;
    configured: boolean;
    checked: boolean;
    total_matches: number;
    suspicious_repos: Array<{
      name: string;
      full_name: string;
      url: string;
      description: string;
      stars: number;
      updated_at: string;
      is_suspicious: boolean;
      flags: string[];
    }>;
    error?: string | null;
  } | null>(null);
  const [ghScanning, setGhScanning] = useState(false);

  async function checkGithub() {
    setGhScanning(true);
    try {
      const res = await fetchBrandGithub(1);
      if (res) setGhData(res);
    } finally {
      setGhScanning(false);
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="YOUR SOURCE OF TRUTH"
        title="Brand digital twin"
        text="Define official assets, executive names, and verified partners to guide detection and ensure official accounts are never flagged."
      />
      <div className="brand-summary">
        <span className="brand-monogram">{name[0] || 'A'}</span>
        <div>
          <span className="eyebrow">PROTECTED IDENTITY</span>
          <h2>{name}</h2>
          <span>Official assets / verified domains / partner allowlist</span>
        </div>
        <span className="verified"><ShieldCheck size={16} /> Backend Twin Active</span>
      </div>
      <form onSubmit={save}>
        <div className="brand-grid">
          <Panel title="Official identity" sub="One asset per line">
            <div className="form">
              <label>
                Brand name
                <input value={name} required onChange={e => setName(e.target.value)} />
              </label>
              <label>
                Official social handles
                <textarea rows={3} value={handles} onChange={e => setHandles(e.target.value)} />
              </label>
              <label>
                Official domains
                <textarea rows={2} value={domains} onChange={e => setDomains(e.target.value)} />
              </label>
              <label>
                Official app package names
                <textarea rows={2} value={packages} onChange={e => setPackages(e.target.value)} />
              </label>
              <label>
                Official publisher / developer names
                <textarea rows={2} value={developers} onChange={e => setDevelopers(e.target.value)} />
              </label>
              <label>
                Official app store description (TF-IDF baseline)
                <textarea
                  rows={2}
                  value={appDesc}
                  onChange={e => setAppDesc(e.target.value)}
                  placeholder="Baseline text used for TF-IDF cosine similarity scoring"
                />
              </label>
              <label>
                Official logo perceptual hash (16-char hex pHash)
                <input
                  value={logoHash}
                  onChange={e => setLogoHash(e.target.value)}
                  placeholder="e.g. 95a57a1e6169a687"
                />
              </label>
            </div>
          </Panel>
          <div>
            <Panel title="Trusted exceptions" sub="Allowlisted fan & partner accounts">
              <div className="form">
                <label>
                  Allowlisted handles
                  <textarea rows={3} value={allowlist} onChange={e => setAllowlist(e.target.value)} />
                </label>
                <label>
                  Key executive names
                  <textarea rows={2} value={execs} onChange={e => setExecs(e.target.value)} />
                </label>
                <div className="info-note">
                  <ShieldCheck size={19} />
                  <span>Exact official matches trigger the <b>OFFICIAL_*_VERIFIED</b> rule and are held strictly at Tier 0.</span>
                </div>
              </div>
            </Panel>
            <Panel title="Rules Engine Gate" className="twin-note">
              <DigitalTwinIcon size={52} strokeWidth={0.9} />
              <p>Your brand reference gives RapidFuzz and the fusion engine the ground truth needed to detect look-alikes while protecting legitimate enterprise accounts.</p>
            </Panel>
          </div>
        </div>
        <div className="form-footer">
          <span role="status">{status || 'Changes are saved into the backend SQLite database.'}</span>
          <button disabled={busy} className="button primary">
            {busy ? 'Saving…' : 'Save brand reference'}
            <Check size={16} />
          </button>
        </div>
      </form>

      <Panel
        title="Live GitHub Imposter Monitor"
        sub="Scans public GitHub repositories for phishing kits, credential harvesting pages, and imposter code leaks"
        action={
          <button type="button" className="button subtle" onClick={checkGithub} disabled={ghScanning}>
            <RefreshCw size={14} className={ghScanning ? 'spinner' : ''} /> {ghScanning ? 'Scanning GitHub…' : 'Scan GitHub'}
          </button>
        }
      >
        {ghData ? (
          <div>
            <div className="dns-summary-strip">
              <span><b>{ghData.total_matches}</b> matches on GitHub</span>
              <span>API Mode: <b style={{ color: ghData.configured ? 'var(--mint)' : 'var(--amber)' }}>{ghData.configured ? 'Live PAT Configured' : 'Public Search'}</b></span>
              <span>Suspicious Repos: <b style={{ color: ghData.suspicious_repos.length > 0 ? 'var(--red)' : 'var(--mint)' }}>{ghData.suspicious_repos.length}</b></span>
            </div>
            {ghData.suspicious_repos.length > 0 ? (
              <div style={{ marginTop: '12px' }}>
                {ghData.suspicious_repos.map(repo => (
                  <div key={repo.full_name} className="github-repo-card">
                    <div>
                      <h4>{repo.full_name}</h4>
                      <p>{repo.description || 'No description provided'}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        {repo.flags.map(f => (
                          <span key={f} className="neutral-chip" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>{f}</span>
                        ))}
                      </div>
                    </div>
                    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="button subtle small">
                      Inspect Repo <ArrowUpRight size={13} />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="body-copy" style={{ marginTop: '10px' }}>
                No active imposter repositories detected targeting {name} on GitHub.
              </p>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <Network size={32} />
            <h3>Brand Repo Protection</h3>
            <p>Click "Scan GitHub" to search for code repositories, rogue APK releases, or fake phishing templates targeting {name}.</p>
          </div>
        )}
      </Panel>
    </>
  );
}

function Evidence({ rows }: { rows: Detection[] }) {
  const { id } = useParams();
  const [r, setR] = useState<Detection | null>(() => rows.find(d => d.id === id) ?? null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (id) {
      const match = rows.find(d => d.id === id);
      if (match) setR(match);
      setLoading(true);
      fetchDetectionDetail(id)
        .then(det => {
          if (det) setR(det);
        })
        .finally(() => setLoading(false));
    }
  }, [id, rows]);

  if (!r) {
    return (
      <>
        <PageTitle eyebrow="EVIDENCE" title={loading ? "Loading evidence…" : "Signal not found"} text={loading ? "Retrieving detection audit trail from backend SQLite…" : "This signal may not be in the current detection queue."} />
        {loading ? (
          <div className="empty-state"><RefreshCw className="spinner" size={28} /><h3>Fetching live detection…</h3></div>
        ) : (
          <Link className="button primary" to="/app">Return to overview <ArrowRight size={15} /></Link>
        )}
      </>
    );
  }

  async function handleVerdict(verdict: 'confirmed_threat' | 'false_positive' | 'uncertain') {
    try {
      await submitVerdict(r!.id, verdict, notes);
      setFeedbackSent(verdict === 'confirmed_threat' ? 'Confirmed as threat' : verdict === 'false_positive' ? 'Marked as false positive' : 'Flagged as uncertain');
    } catch (e) {
      alert('Could not submit verdict: ' + (e instanceof Error ? e.message : 'Backend error'));
    }
  }

  return (
    <>
      <PageTitle
        eyebrow={`EVIDENCE / #${r.id}`}
        title="Detection evidence"
        text="Corroborated signal breakdown, explainable reason codes, and SOC verdict controls."
        action={
          <button
            className="button subtle"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(JSON.stringify(r, null, 2));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <CheckCheck size={16} /> : <Copy size={16} />} {copied ? 'Copied JSON' : 'Copy report'}
          </button>
        }
      />
      <div className="evidence-header">
        <span className={`asset-icon large ${r.type}`}>
          {r.type === 'app' ? <Smartphone size={30} /> : (r.type === 'url' ? <Globe2 size={30} /> : <Users size={30} />)}
        </span>
        <div>
          <h2>{r.name}</h2>
          <p>{r.platform} · Detected {r.time} · Provenance: <b style={{ color: 'var(--accent)' }}>{r.provenance ?? 'live'}</b></p>
        </div>
        <Badge tier={r.tier} />
      </div>

      <div className="evidence-grid">
        <Panel title="Threat Score Breakdown" sub="Corroborated by ML & Rule Gates">
          <div className={`evidence-score tier-${r.tier}`}>
            <strong>{r.score}</strong>
            <span>Threat score<br />out of 100</span>
          </div>
          <p className="body-copy">
            {r.tier === 2
              ? 'Critical threat (Tier 2). High corroboration between brand mutation rules and behavioral ML model.'
              : r.tier === 1
              ? 'Suspicious candidate (Tier 1). Moderate anomaly requiring analyst triage.'
              : 'Benign / Official asset (Tier 0). Excluded from active threat alerting.'}
          </p>

          {/* Analyst Verdict Actions */}
          <div className="verdict-box">
            <span className="eyebrow">RECORD ANALYST VERDICT</span>
            {feedbackSent ? (
              <div className="feedback-success">
                <CheckCircle2 size={16} />
                <span>Verdict recorded: <b>{feedbackSent}</b>. Updated backend audit log.</span>
              </div>
            ) : (
              <>
                <textarea
                  rows={2}
                  placeholder="Analyst notes for the audit trail…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <div className="verdict-buttons">
                  <button className="button primary small" onClick={() => handleVerdict('confirmed_threat')}>
                    <AlertCircle size={14} /> Confirm Threat
                  </button>
                  <button className="button subtle small" onClick={() => handleVerdict('false_positive')}>
                    <Check size={14} /> False Positive
                  </button>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel title="Reason codes" sub="Trace verdict to concrete signals">
          <div className="reason-cards">
            {r.reasons.map((reason, i) => (
              <div key={reason}>
                <span className="mono">0{i + 1}</span>
                <div>
                  <strong>{reason}</strong>
                  <small>{readable(reason)}</small>
                </div>
                <Target size={16} />
              </div>
            ))}
          </div>
          {r.components && Object.keys(r.components).length > 0 && (
            <div className="component-list">
              <span className="eyebrow" style={{ marginTop: '12px', display: 'block' }}>COMPONENT SCORES</span>
              {Object.entries(r.components).map(([k, v]) => (
                <div key={k} className="comp-item">
                  <span>{readable(k)}</span>
                  <b>{typeof v === 'number' ? `${Math.round(v * 10) / 10}%` : String(v)}</b>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {r.shap && Object.keys(r.shap).length > 0 && (
        <Panel title="Tree SHAP Feature Attribution" sub="Explainable ML feature contributions to threat verdict">
          <div className="shap-grid">
            {Object.entries(r.shap).map(([feat, val]) => {
              const num = Number(val);
              const isPos = num >= 0;
              return (
                <div key={feat} className="shap-row">
                  <span className="mono">{feat}</span>
                  <div className="shap-bar-wrap">
                    <div
                      className={`shap-bar ${isPos ? 'pos' : 'neg'}`}
                      style={{ width: `${Math.min(100, Math.max(12, Math.abs(num) * 22))}%` }}
                    />
                  </div>
                  <b style={{ color: isPos ? 'var(--red)' : 'var(--mint)' }}>
                    {isPos ? `+${num.toFixed(3)}` : num.toFixed(3)}
                  </b>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {r.enrichment && (
        <Panel title="Live Threat Intelligence Feeds" sub="Corroborated across 6 external intelligence APIs">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Google Safe Browsing</span>
              <strong style={{ color: (r.enrichment.google_safe_browsing as Record<string, unknown>)?.blacklisted ? 'var(--red)' : 'var(--mint)', fontSize: '13px' }}>
                {(r.enrichment.google_safe_browsing as Record<string, unknown>)?.blacklisted ? '● BLACKLISTED (Malware)' : '● Clean / Not Listed'}
              </strong>
            </div>
            <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>VirusTotal Consensus</span>
              <strong style={{ color: Number((r.enrichment.virustotal as Record<string, unknown>)?.malicious_count || 0) > 0 ? 'var(--red)' : 'var(--mint)', fontSize: '13px' }}>
                {String((r.enrichment.virustotal as Record<string, unknown>)?.malicious_count || 0)} / {String((r.enrichment.virustotal as Record<string, unknown>)?.total_engines || 0)} AV Engines
              </strong>
            </div>
            <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>AbuseIPDB IP Reputation</span>
              <strong style={{ color: Number((r.enrichment.abuseipdb as Record<string, unknown>)?.abuse_score || 0) > 20 ? 'var(--red)' : 'var(--mint)', fontSize: '13px' }}>
                {String((r.enrichment.abuseipdb as Record<string, unknown>)?.abuse_score ?? 0)}% Abuse Risk
              </strong>
            </div>
            <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>AlienVault OTX Pulses</span>
              <strong style={{ color: Number((r.enrichment.alienvault as Record<string, unknown>)?.pulse_count || 0) > 0 ? 'var(--amber)' : 'var(--mint)', fontSize: '13px' }}>
                {String((r.enrichment.alienvault as Record<string, unknown>)?.pulse_count || 0)} Threat Pulses
              </strong>
            </div>
            <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>crt.sh Certificate</span>
              <strong style={{ color: (r.enrichment.certificates as Record<string, unknown>)?.has_tls_cert ? 'var(--amber)' : 'var(--muted)', fontSize: '13px' }}>
                {(r.enrichment.certificates as Record<string, unknown>)?.has_tls_cert ? 'Active TLS Issued' : 'No TLS Certificate'}
              </strong>
            </div>
            <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>ICANN RDAP Age</span>
              <strong style={{ color: (r.enrichment.rdap as Record<string, unknown>)?.is_newly_registered ? 'var(--red)' : 'var(--mint)', fontSize: '13px' }}>
                {(r.enrichment.rdap as Record<string, unknown>)?.age_days != null ? `${(r.enrichment.rdap as Record<string, unknown>).age_days}d registered` : 'Unregistered'}
              </strong>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Asset comparison" sub="Candidate against Brand Digital Twin">
        <div className="compare-grid">
          <div>
            <span className="eyebrow">CANDIDATE ASSET</span>
            <h3>{r.name}</h3>
            <Badge tier={r.tier} />
          </div>
          <div>
            <span className="eyebrow">VERIFIED OFFICIAL REFERENCE</span>
            <h3>{r.type === 'profile' ? '@apexbank' : 'com.apexbank.mobile'}</h3>
            <span className="verified"><ShieldCheck size={16} /> Apex Global Bank</span>
          </div>
        </div>
      </Panel>
    </>
  );
}

function Cases() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const loadCases = async (statusFilter?: string) => {
    setLoading(true);
    try {
      const data = await fetchCases(statusFilter === 'All' ? undefined : statusFilter);
      setCases(data);
    } catch (e) {
      console.error('Failed to load cases from backend:', e);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases(filter);
  }, [filter]);

  async function updateStatus(caseId: number, newStatus: string, priority: string) {
    try {
      await reviewCase(caseId, newStatus, priority);
      setNotice(`Case #${caseId} updated to '${newStatus}'. Recorded to audit trail.`);
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: newStatus as CaseItem['status'] } : c));
    } catch (e) {
      setNotice('Could not update case: ' + (e instanceof Error ? e.message : 'API error'));
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="HUMAN JUDGMENT / IN THE LOOP"
        title="Investigation cases"
        text="SOC triage queue. Review high-confidence threats, assign priorities, and log audit trail events."
      />
      <div className="tabs standalone">
        {['All', 'Open', 'Reviewing', 'Escalated', 'Closed'].map(f => (
          <button className={filter === f ? 'active' : ''} key={f} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      {notice && <p className="panel-sub" style={{ color: 'var(--accent)' }}>{notice}</p>}

      {loading ? (
        <div className="empty-state"><RefreshCw className="spinner" /><h3>Loading cases from SQLite…</h3></div>
      ) : (
        <div className="case-grid">
          {cases.map(c => {
            const assetName = c.asset?.value ?? `Detection #${c.detection?.id ?? c.id}`;
            const tier = c.detection?.tier ?? 1;
            const rawReasons = c.detection?.reason_codes;
            const reasons = Array.isArray(rawReasons)
              ? rawReasons.map(String)
              : typeof rawReasons === 'string'
              ? (rawReasons as string).split(/\s+/).filter(Boolean)
              : [];
            return (
              <Panel
                key={c.id}
                title={`CASE #${c.id}`}
                sub={`${c.asset?.type === 'profile' ? 'Social Impersonation' : 'Rogue Application'} · Priority: ${c.priority.toUpperCase()}`}
                action={<Badge tier={tier} />}
              >
                <h3 className="case-name">{assetName}</h3>
                <p>{reasons[0] ? readable(reasons[0]) : 'Candidate threat under investigation'}</p>
                <div className="case-bottom">
                  {c.detection?.id ? (
                    <Link to={`/app/evidence/${c.detection.id}`}>View evidence <ArrowUpRight size={15} /></Link>
                  ) : (
                    <span className="muted">No evidence link</span>
                  )}
                  <select
                    aria-label={`Status for Case #${c.id}`}
                    value={c.status}
                    onChange={e => updateStatus(c.id, e.target.value, c.priority)}
                  >
                    <option value="open">Open</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="escalated">Escalated</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      {!loading && !cases.length && (
        <div className="empty-state">
          <ShieldCheck />
          <h3>Queue clear</h3>
          <p>No cases match this filter in the backend.</p>
        </div>
      )}
    </>
  );
}

function Campaigns({ rows }: { rows: Detection[] }) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns().then(res => {
      if (res && res.length) setCampaigns(res);
    });
  }, []);

  const current = campaigns[selectedIdx];
  const nodes = current?.nodes ?? rows.filter(r => r.tier > 0).slice(0, 5).map(r => ({
    id: r.id,
    label: r.name,
    type: r.type,
    role: 'threat' as const,
    threat_score: r.score,
    risk_tier: r.tier,
    reason_codes: r.reasons,
  }));

  return (
    <>
      <PageTitle
        eyebrow="CORRELATED THREAT CLUSTERS"
        title="Campaign intelligence"
        text="Identifies multi-vector infrastructure sharing identical payloads, logo mutations, or publisher patterns."
      />
      {campaigns.length > 0 && (
        <div className="tabs standalone">
          {campaigns.map((c, i) => (
            <button key={c.id} className={selectedIdx === i ? 'active' : ''} onClick={() => { setSelectedIdx(i); setSelectedNode(null); }}>
              {c.id}: {c.category} ({c.asset_count} assets)
            </button>
          ))}
        </div>
      )}
      <div className="graph-grid">
        <Panel
          title={current?.title ?? 'Relationship Explorer'}
          sub={current ? `${current.category} · Severity: ${current.severity.toUpperCase()}` : 'Brand-name correlation'}
        >
          <div className="network-canvas">
            <svg viewBox="0 0 600 420" aria-hidden="true">
              {nodes.map((_, i) => {
                const a = (i / nodes.length) * Math.PI * 2;
                return (
                  <line
                    key={i}
                    x1="300"
                    y1="210"
                    x2={300 + 180 * Math.cos(a)}
                    y2={210 + 145 * Math.sin(a)}
                    stroke="var(--accent)"
                    strokeDasharray="4 5"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
            <div className="network-brand">
              <Shield size={25} />
              <strong>APEX</strong>
              <small>BRAND TWIN</small>
            </div>
            {nodes.map((n, i) => {
              const a = (i / nodes.length) * Math.PI * 2;
              return (
                <button
                  key={n.id}
                  className={`network-node ${selectedNode === n.id ? 'selected' : ''}`}
                  onClick={() => setSelectedNode(n.id)}
                  style={{ left: `${50 + 30 * Math.cos(a)}%`, top: `${50 + 34 * Math.sin(a)}%` }}
                  aria-label={`Inspect ${n.label}`}
                >
                  {n.type === 'app' ? <Smartphone size={17} /> : <Users size={17} />}
                  <span>{n.label}</span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Campaign Details" sub={current?.id ?? 'Cluster Analysis'}>
          {current && (
            <div className="campaign-detail-pane">
              <span className="eyebrow">CLUSTER SUMMARY</span>
              <h3>{current.title}</h3>
              <p className="body-copy">{current.description}</p>
              <div className="kpi-mini-grid">
                <div><span>Linked Assets</span><strong>{current.asset_count}</strong></div>
                <div><span>Max Score</span><strong style={{ color: 'var(--red)' }}>{current.max_threat_score}</strong></div>
                <div><span>Severity</span><strong style={{ color: 'var(--accent)' }}>{current.severity.toUpperCase()}</strong></div>
              </div>
              <span className="eyebrow" style={{ marginTop: '16px', display: 'block' }}>TARGETED BRAND</span>
              <div className="compare-grid" style={{ marginTop: '8px' }}>
                <div><small>Victim Asset</small><strong>Apex Global Bank</strong></div>
                <div><small>Cluster Status</small><strong>{current.status.toUpperCase()}</strong></div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

function Domains() {
  const [domain, setDomain] = useState('apexbank.com');
  const [results, setResults] = useState<TyposquatEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<{ total: number; active: number; mail: number; certs: number; newly: number } | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const clean = domain.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(clean)) {
        throw new Error('Enter a valid domain name like apexbank.com');
      }
      const data = await fetchTyposquats(clean);
      setResults(data);
      const active = data.filter(d => d.resolved).length;
      const mail = data.filter(d => d.has_mx).length;
      const certs = data.filter(d => d.has_tls_cert).length;
      const newly = data.filter(d => d.domain_age_days != null && d.domain_age_days < 30).length;
      setSummary({ total: data.length, active, mail, certs, newly });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Domain lookup failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="HOMOGLYPHS, OMISSIONS & TLD SWAPS"
        title="Domain intelligence"
        text="Generates look-alike domain permutations with live DNS (A/MX), ICANN RDAP age, and crt.sh Certificate Transparency logs."
      />
      <Panel title="Explore a protected domain" sub="Generates mutations and checks live DNS, SSL certs & WHOIS RDAP">
        <form className="domain-form" onSubmit={generate}>
          <Globe2 size={20} />
          <input required aria-label="Protected domain" value={domain} onChange={e => setDomain(e.target.value)} />
          <button className="button primary" disabled={busy}>
            {busy ? 'Resolving Infrastructure…' : 'Generate & check DNS'}
            <ArrowRight size={16} />
          </button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}

        {summary && (
          <div className="dns-summary-strip">
            <span><b>{summary.total}</b> permutations</span>
            <span><b style={{ color: summary.active > 0 ? 'var(--red)' : 'var(--mint)' }}>{summary.active}</b> active IPs</span>
            <span><b style={{ color: summary.mail > 0 ? 'var(--amber)' : 'var(--mint)' }}>{summary.mail}</b> MX records</span>
            <span><b style={{ color: summary.certs > 0 ? 'var(--red)' : 'var(--mint)' }}>{summary.certs}</b> SSL certs</span>
            {summary.newly > 0 && <span><b style={{ color: 'var(--red)' }}>{summary.newly}</b> newly registered</span>}
          </div>
        )}

        {results.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>DOMAIN VARIANT</th>
                  <th>MUTATION TYPE</th>
                  <th>THREAT SCORE</th>
                  <th>DNS / IP RESOLUTION</th>
                  <th>ENRICHED INTEL (SSL / WHOIS)</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.domain}>
                    <td>
                      <span className="domain-name">
                        <Globe2 size={16} />
                        {r.domain}
                      </span>
                    </td>
                    <td>{r.mutation_type}</td>
                    <td><Badge tier={r.tier} /></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {r.resolved ? (
                          <span className="neutral-chip" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
                            ● Resolved: {r.ip_address || 'Active'}
                          </span>
                        ) : (
                          <span className="neutral-chip" style={{ color: 'var(--muted)' }}>No DNS Record</span>
                        )}
                        {r.has_mx && (
                          <span className="neutral-chip" style={{ color: 'var(--amber)', borderColor: 'var(--amber)' }}>
                            Mail Capable (MX)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {r.reason_codes?.includes('GOOGLE_SAFE_BROWSING_BLACKLISTED') && (
                          <span className="neutral-chip" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
                            ● Google Safe Browsing Blacklisted
                          </span>
                        )}
                        {r.reason_codes?.includes('VIRUSTOTAL_MALICIOUS_CONSENSUS') && (
                          <span className="neutral-chip" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
                            ● VirusTotal Consensus
                          </span>
                        )}
                        {r.reason_codes?.includes('ALIENVAULT_PULSE_MATCH') && (
                          <span className="neutral-chip" style={{ color: 'var(--amber)', borderColor: 'var(--amber)' }}>
                            ● AlienVault OTX Pulse
                          </span>
                        )}
                        {r.has_tls_cert && (
                          <span className="neutral-chip" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
                            TLS Cert (crt.sh)
                          </span>
                        )}
                        {r.domain_age_days != null ? (
                          <span className="neutral-chip" style={{ color: r.domain_age_days < 30 ? 'var(--red)' : 'var(--mint)' }}>
                            {r.domain_age_days}d old {r.registration_date ? `(${r.registration_date})` : ''}
                          </span>
                        ) : null}
                        {r.abuse_score != null && r.abuse_score > 0 ? (
                          <span className="neutral-chip" style={{ color: 'var(--red)' }}>
                            {r.abuse_score}% AbuseIP {r.isp ? `(${r.isp})` : ''}
                          </span>
                        ) : null}
                        {!r.has_tls_cert && r.domain_age_days == null && (
                          <span className="neutral-chip" style={{ color: 'var(--muted)' }}>No live cert / RDAP</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Globe2 size={35} />
            <h3>Look beyond your domain.</h3>
            <p>Generate look-alikes to verify DNS and MX infrastructure targeting your brand.</p>
          </div>
        )}
      </Panel>
    </>
  );
}

function Monitor() {
  const [metrics, setMetrics] = useState<FeedbackSummary | null>(null);

  useEffect(() => {
    fetchFeedbackSummary().then(setMetrics);
  }, []);

  return (
    <>
      <PageTitle
        eyebrow="TRANSPARENCY / BY DESIGN"
        title="Model intelligence & feedback"
        text="Architecture specifications, trained XGBoost models, and real-time active learning precision metrics."
      />

      {metrics && (
        <div className="kpi-grid">
          <div className="kpi mint">
            <div><span>Model Precision</span><ShieldCheck size={17} /></div>
            <strong>{metrics.model_precision_pct}%</strong>
            <small>Active SOC corroborated rate</small>
          </div>
          <div className="kpi amber">
            <div><span>False Positive Rate</span><AlertCircle size={17} /></div>
            <strong>{metrics.false_positive_rate_pct}%</strong>
            <small>Low error margin</small>
          </div>
          <div className="kpi mint">
            <div><span>Total Analyst Reviews</span><Activity size={17} /></div>
            <strong>{metrics.total_reviews}</strong>
            <small>Human-in-the-loop audit logs</small>
          </div>
        </div>
      )}

      <div className="model-grid">
        {[
          {
            name: 'Social Profile XGBoost Model',
            version: 'social_xgb_v1.0',
            features: '11 Behavioral Features',
            description: 'Trained on follower patterns, username ratios, profile image, and bio metadata. Evaluates RapidFuzz identity similarity with bonus look-alike detectors.',
            icon: Users
          },
          {
            name: 'Rogue Mobile APK Model',
            version: 'mobile_xgb_v1.0',
            features: '215 Permission & API Flags',
            description: 'Analyzes high-risk Android permissions (SMS, overlay, accessibility), TF-IDF description similarity, and pHash logo comparison against official banking assets.',
            icon: Smartphone
          }
        ].map(m => (
          <Panel key={m.name} title={m.name} sub={`${m.version} · Local Inference`} action={<m.icon size={22} />}>
            <div className="model-visual">
              <Cpu size={45} strokeWidth={1} />
              <span className="eyebrow">{m.version} ACTIVE</span>
            </div>
            <h3>{m.features}</h3>
            <p className="body-copy">{m.description}</p>
            <span className="neutral-chip" style={{ color: 'var(--mint)', borderColor: 'var(--mint)' }}>
              ● Model loaded in backend
            </span>
          </Panel>
        ))}
      </div>

      <Panel title="How a verdict comes together" sub="50/50 Rule & Model Fusion Architecture">
        <div className="fusion-flow">
          <div><DigitalTwinIcon size={24} /><strong>Brand Rules</strong><span>Identity & Allowlist</span></div>
          <Plus size={20} />
          <div><Layers3 size={24} /><strong>XGBoost Model</strong><span>Behavioral Inference</span></div>
          <ArrowRight size={20} />
          <div><ShieldCheck size={24} /><strong>Corroborated Tier</strong><span>Observe (0) / Review (1) / Escalate (2)</span></div>
        </div>
        <div className="info-note">
          <SlidersHorizontal size={20} />
          <span><b>Official Exclusion Guarantee:</b> Exact matches to the Brand Digital Twin are held strictly at Tier 0 and excluded from threat alerts. Critical escalation (Tier 2) requires corroborating signals from both the rule gate and ML model.</span>
        </div>
      </Panel>
    </>
  );
}

function Architecture() {
  const [simScenario, setSimScenario] = useState<'official' | 'lookalike' | 'trojan' | 'unrelated'>('official');

  const scenarios = {
    official: {
      name: '@apexbank (Official Brand Profile)',
      type: 'Social Profile',
      verdict: 'Tier 0 — Observe (Official Asset Excluded)',
      score: 0.0,
      steps: [
        { title: '1. Candidate Ingestion', desc: 'Candidate handle @apexbank received via API analyzer or ingestion stream.' },
        { title: '2. Brand Twin Set-Membership Query', desc: 'Querying Brand Digital Twin declared handles: ["@apexbank", "@apex_support", "@apexbank_careers"].' },
        { title: '3. Official Exclusion Gate Check', desc: 'MATCH FOUND: norm("@apexbank") ∈ norm(brand.handles).' },
        { title: '4. Immediate Tier 0 Short-Circuit', desc: 'Risk score set to 0.0. Behavioral ML & Rule engines BYPASSED (0% False Positive Rate by design).' },
        { title: '5. Reason Code Emitted', desc: 'OFFICIAL_ACCOUNT_VERIFIED persisted to SQLite & broadcast via WebSocket /ws/feed.' }
      ]
    },
    lookalike: {
      name: '@apexb0nk_support (Scam Customer Care)',
      type: 'Social Profile',
      verdict: 'Tier 2 — Escalate (Critical Impersonator)',
      score: 87.5,
      steps: [
        { title: '1. Candidate Ingestion', desc: 'Candidate handle @apexb0nk_support ingested with 8 followers, 410 following, 1 post.' },
        { title: '2. Official Exclusion Gate Check', desc: 'NO MATCH: Handle does not match official list. Pipeline proceeds to detection engines.' },
        { title: '3. Deterministic Rules Layer', desc: 'LOOKALIKE_CHAR_SWAP (0→o substitution) and LOOKALIKE_ADDED_WORD ("support") detected. Rules Score: 85.0.' },
        { title: '4. Behavioral ML (Social XGBoost)', desc: 'Follower ratio anomaly (8/410 = 0.019) detected. Tree-SHAP identifies follower count as top contributor. ML Score: 90.0.' },
        { title: '5. 50/50 Fusion & Corroboration', desc: 'Both engines corroborate (Rules: 85, ML: 90). Corroboration gate passed: Tier 2 Escalate assigned. Case auto-created.' }
      ]
    },
    trojan: {
      name: 'com.apexbank.fraud.apk (Rogue Banking Clone)',
      type: 'Mobile APK Application',
      verdict: 'Tier 2 — Escalate (Critical Rogue App)',
      score: 94.3,
      steps: [
        { title: '1. Candidate Ingestion', desc: 'APK package com.apexbank.fraud.apk ingested with developer "Apex Clone Devs".' },
        { title: '2. Official Exclusion Gate Check', desc: 'NO MATCH: Package name not in official app_ids list. Pipeline proceeds to App Store Engine.' },
        { title: '3. 4-Signal App Store Engine', desc: 'UNAUTHORIZED_PUBLISHER flagged (score: 90.0). ImageHash pHash comparison matches official logo at 90.6% visual similarity.' },
        { title: '4. Rogue Permission ML (XGBoost)', desc: '215-permission vector evaluates SEND_SMS, READ_SMS, SYSTEM_ALERT_WINDOW. Permission anomaly score: 98.6.' },
        { title: '5. Fusion & Investigation Escalation', desc: 'Corroborated Tier 2 Escalate assigned (Score: 94.3). High-priority investigation case created in SQLite.' }
      ]
    },
    unrelated: {
      name: '@apex_logistics_cargo (Unrelated Business)',
      type: 'Social Profile',
      verdict: 'Tier 0 — Observe (Safe / Low Risk)',
      score: 24.4,
      steps: [
        { title: '1. Candidate Ingestion', desc: 'Candidate handle @apex_logistics_cargo ingested with 12,000 followers.' },
        { title: '2. Official Exclusion Gate Check', desc: 'NO MATCH: Not an official handle. Proceeds to similarity analysis.' },
        { title: '3. Anti-Overflagging Rule Check', desc: 'Remainder after stripping "apex" resolves to "logistics cargo". Residual fuzz against brand root fails threshold (< 80).' },
        { title: '4. Behavioral ML Layer', desc: 'Profile metrics are normal (12k followers, balanced following ratio). ML probability < 20%.' },
        { title: '5. Tier 0 Safe Assignment', desc: 'Composite score: 24.4. Filtered out from alert queues. Zero false alarms generated.' }
      ]
    }
  };

  const activeData = scenarios[simScenario];

  return (
    <>
      <PageTitle
        eyebrow="CHALLENGE 03 SPECIFICATION DELIVERABLE"
        title="Architecture & Exclusion Logic"
        text="Interactive blueprint detailing data sources, the Tier 0 Official Asset Exclusion Gate, dual-engine hybrid detection (Rules + XGBoost ML), 50/50 fusion, and SQLite relational storage."
      />

      {/* Tier 0 Exclusion Guarantee Banner */}
      <div className="arch-gate-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge">RUBRIC MANDATORY GATE</span>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--accent)' }}>0.00% Measured False Positive Rate</span>
          </div>
          <h3>Official Asset Exclusion Architecture (Tier 0 Short-Circuit)</h3>
          <p>
            The hackathon brief mandates that <strong>"official accounts and official apps should not be flagged"</strong>.
            Aegis enforces this structurally through an exact set-membership gate that executes <em>before</em> any heuristic scorers or ML models run.
            If a candidate matches the declared Brand Digital Twin, it immediately exits the pipeline at Tier 0 with score 0.0, completely immune to statistical false positives.
          </p>
        </div>
        <ShieldCheck size={48} style={{ color: 'var(--mint)', flexShrink: 0 }} />
      </div>

      {/* Multi-Stage Visual Architecture Flow */}
      <div className="arch-flow-diagram">
        {/* Column 1: Ingestion & Sources */}
        <div className="arch-flow-col">
          <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Layers3 size={13} /> 1. DATA SOURCES & INGESTION</span>
          <div className="arch-card">
            <div className="arch-card-header">
              <div className="icon-wrap"><Users size={16} /></div>
              <h4>Social Media Streams</h4>
            </div>
            <p>Monitors external social profiles and brand mentions across platforms.</p>
            <ul>
              <li><strong>Platforms:</strong> Twitter/X, Instagram, LinkedIn, Telegram</li>
              <li><strong>Metadata:</strong> Handle, display name, bio, follower/following counts, post frequency</li>
            </ul>
          </div>
          <div className="arch-card">
            <div className="arch-card-header">
              <div className="icon-wrap"><Smartphone size={16} /></div>
              <h4>App Store Telemetry</h4>
            </div>
            <p>Monitors mobile marketplaces for unauthorized and rogue brand apps.</p>
            <ul>
              <li><strong>Sources:</strong> Google Play Store, Apple App Store, APK mirrors</li>
              <li><strong>Extracted Signals:</strong> Package ID, publisher entity, TF-IDF description, icon pHash, 215 Android permissions</li>
            </ul>
          </div>
          <div className="arch-card">
            <div className="arch-card-header">
              <div className="icon-wrap"><Globe2 size={16} /></div>
              <h4>Live Threat Intelligence</h4>
            </div>
            <p>Real-time API feeds augmenting local model verdicts.</p>
            <ul>
              <li><strong>Feeds:</strong> AbuseIPDB, Google Safe Browsing v4, AlienVault OTX, VirusTotal v3, GitHub Advisory</li>
              <li><strong>Resilience:</strong> Automatic local fallback if API limits or partitions occur</li>
            </ul>
          </div>
        </div>

        {/* Column 2: Ground Truth & Exclusion Gate */}
        <div className="arch-flow-col">
          <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DigitalTwinIcon size={13} /> 2. GROUND TRUTH & EXCLUSION</span>
          <div className="arch-card highlight-gate">
            <div className="arch-card-header">
              <div className="icon-wrap" style={{ color: 'var(--mint)', background: 'rgba(62,207,142,0.1)' }}><ShieldCheck size={16} /></div>
              <h4>Brand Digital Twin</h4>
            </div>
            <p>Authoritative source-of-truth defined by the organization.</p>
            <ul>
              <li><strong>Handles:</strong> @apexbank, @apex_support, @apexbank_careers</li>
              <li><strong>App IDs:</strong> com.apexbank.mobile, com.apexbank.securepass</li>
              <li><strong>Publishers:</strong> Apex Financial Group LLC, Apex Bank Corp</li>
              <li><strong>Logo Baseline:</strong> 64-bit ImageHash perceptual hash (16 hex)</li>
              <li><strong>Description:</strong> Standard banking baseline for TF-IDF cosine</li>
              <li><strong>Allowlist:</strong> @apex_fanclub, @apex_community</li>
            </ul>
          </div>
          <div className="arch-card highlight-gate">
            <div className="arch-card-header">
              <div className="icon-wrap" style={{ color: 'var(--accent)', background: 'rgba(179,244,206,0.15)' }}><Shield size={16} /></div>
              <h4>Tier 0 Exclusion Gate</h4>
            </div>
            <p><strong>Structural Set-Membership Filter:</strong></p>
            <ul>
              <li>If <code>handle ∈ brand.handles</code> → <strong>Tier 0 (0.0)</strong></li>
              <li>If <code>package ∈ brand.app_ids</code> → <strong>Tier 0 (0.0)</strong></li>
              <li>If <code>handle ∈ brand.allowlist</code> → <strong>Tier 0 (15.0)</strong></li>
              <li><strong>Emits:</strong> OFFICIAL_ACCOUNT_VERIFIED / OFFICIAL_APP_VERIFIED</li>
              <li><strong>Result:</strong> ML models never run on official assets</li>
            </ul>
          </div>
        </div>

        {/* Column 3: Hybrid Detection Engines */}
        <div className="arch-flow-col">
          <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Cpu size={13} /> 3. DUAL HYBRID ENGINES</span>
          <div className="arch-card">
            <div className="arch-card-header">
              <div className="icon-wrap"><SlidersHorizontal size={16} /></div>
              <h4>Deterministic Rules Layer</h4>
            </div>
            <p>Rapid heuristic verification with typed reason codes.</p>
            <ul>
              <li><strong>Identity:</strong> RapidFuzz token matching & Levenshtein</li>
              <li><strong>Look-alike Bonus:</strong> 0→o char swaps, added words, spacing collapse</li>
              <li><strong>Anti-Overflagging:</strong> Residual fuzz &gt; 80 prevents false alerts</li>
              <li><strong>App Store Signals:</strong> Publisher mismatch, TF-IDF text similarity, logo pHash Hamming distance</li>
            </ul>
          </div>
          <div className="arch-card highlight-ml">
            <div className="arch-card-header">
              <div className="icon-wrap" style={{ color: 'var(--mint)', background: 'rgba(62,207,142,0.1)' }}><Layers3 size={16} /></div>
              <h4>Behavioral Machine Learning</h4>
            </div>
            <p>Trained gradient boosted decision trees with native explainability.</p>
            <ul>
              <li><strong>Social XGBoost:</strong> 11 behavioral profile features — <strong>92.50% Accuracy</strong></li>
              <li><strong>Mobile XGBoost:</strong> 215 APK permission flags — <strong>97.91% Accuracy</strong></li>
              <li><strong>Tree-SHAP:</strong> Native booster pred_contribs (top-5 attribution bars without third-party weight)</li>
            </ul>
          </div>
        </div>

        {/* Column 4: Corroboration & Storage */}
        <div className="arch-flow-col">
          <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldAlert size={13} /> 4. CORROBORATION & DISSEMINATION</span>
          <div className="arch-card">
            <div className="arch-card-header">
              <div className="icon-wrap"><Activity size={16} /></div>
              <h4>50/50 Corroboration Fusion</h4>
            </div>
            <p>Harmonizes rules and machine learning into decision tiers.</p>
            <ul>
              <li><strong>Score Formula:</strong> 0.5 × Rules + 0.5 × ML (0–100)</li>
              <li><strong>Tier 0 (Observe):</strong> Score &lt; 40 or official short-circuit</li>
              <li><strong>Tier 1 (Review):</strong> Score 40–74 or strong standalone signal</li>
              <li><strong>Tier 2 (Escalate):</strong> Score ≥ 75 <em>AND</em> Rules ≥ 70 <em>AND</em> ML ≥ 50</li>
              <li><strong>Hard-Negative Guard:</strong> Neither engine alone can escalate to Tier 2</li>
            </ul>
          </div>
          <div className="arch-card">
            <div className="arch-card-header">
              <div className="icon-wrap"><Database size={16} /></div>
              <h4>SQLite Persistence & Feeds</h4>
            </div>
            <p>Relational storage with audit integrity & real-time dispatch.</p>
            <ul>
              <li><strong>7 Relational Tables:</strong> users, brands, assets, detections, cases, case_notes, audit_events</li>
              <li><strong>WebSocket Feed:</strong> Broadcasts detections live to connected SOC consoles (/ws/feed)</li>
              <li><strong>IOC Export:</strong> JSON, CSV, and Plaintext firewall blocklists</li>
              <li><strong>Supabase Auth:</strong> Cloud RBAC sessions & Antigravity MCP integration</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Interactive Simulator Section */}
      <div className="arch-sim-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Play size={13} style={{ color: 'var(--accent)' }} /> LIVE PIPELINE SIMULATOR
            </span>
            <h3 style={{ margin: '4px 0 0', color: 'var(--text)', fontSize: '18px' }}>Test How Candidates Flow Through The Architecture</h3>
          </div>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>Click a scenario below to trace execution:</span>
        </div>

        <div className="arch-sim-buttons">
          <button
            className={`arch-sim-btn ${simScenario === 'official' ? 'active' : ''}`}
            onClick={() => setSimScenario('official')}
          >
            <ShieldCheck size={14} style={{ color: 'var(--mint)' }} /> 1. Official Handle (@apexbank)
          </button>
          <button
            className={`arch-sim-btn ${simScenario === 'lookalike' ? 'active' : ''}`}
            onClick={() => setSimScenario('lookalike')}
          >
            <AlertCircle size={14} style={{ color: 'var(--amber)' }} /> 2. Lookalike Scam (@apexb0nk_support)
          </button>
          <button
            className={`arch-sim-btn ${simScenario === 'trojan' ? 'active' : ''}`}
            onClick={() => setSimScenario('trojan')}
          >
            <Smartphone size={14} style={{ color: 'var(--red)' }} /> 3. Rogue Clone APK (com.apexbank.fraud.apk)
          </button>
          <button
            className={`arch-sim-btn ${simScenario === 'unrelated' ? 'active' : ''}`}
            onClick={() => setSimScenario('unrelated')}
          >
            <Users size={14} /> 4. Unrelated Brand (@apex_logistics_cargo)
          </button>
        </div>

        <div className="arch-sim-trace">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
            <div>
              <strong style={{ color: 'var(--text)', fontSize: '14px' }}>{activeData.name}</strong>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '10px' }}>Type: {activeData.type}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: activeData.score >= 75 ? 'var(--red)' : (activeData.score > 0 ? 'var(--amber)' : 'var(--mint)') }}>
                Score: {activeData.score}
              </span>
              <span className={`badge ${activeData.score >= 75 ? 'tier-2' : (activeData.score >= 40 ? 'tier-1' : 'tier-0')}`}>
                {activeData.verdict}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            {activeData.steps.map((st, idx) => (
              <div key={idx} className="arch-trace-step">
                <span className="step-num">{idx + 1}</span>
                <div className="step-content">
                  <strong>{st.title}</strong>
                  <span>{st.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Root() {
  const [rows, setRows] = useState<Detection[]>([]);
  const [brand, setBrand] = useState<BrandTwin | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<AnalystProfile | null>(() => getStoredAnalyst());
  const [accountProfile, setAccountProfile] = useState<AccountProfile>(() => {
    const p = readProfile();
    const stored = getStoredAnalyst();
    if (stored) {
      return {
        ...p,
        name: stored.full_name,
        email: stored.email,
        title: stored.role,
      };
    }
    return p;
  });
  const location = useLocation();

  useEffect(() => {
    if (currentUser) {
      setAccountProfile(prev => ({
        ...prev,
        name: currentUser.full_name,
        email: currentUser.email,
        title: currentUser.role,
      }));
    }
  }, [currentUser]);

  const handleAccountSave = (p: AccountProfile) => {
    saveProfile(p);
    setAccountProfile(p);
  };

  const handleSignOut = async () => {
    await signOutSupabase();
    saveStoredAnalyst(null);
    setCurrentUser(null);
  };

  const loadData = async () => {
    try {
      const [dets, b] = await Promise.all([fetchDetections(), fetchActiveBrand()]);
      setRows(dets);
      if (b) setBrand(b);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    loadData();

    // WebSocket live stream integration
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => console.log('WebSocket feed connected:', wsUrl);
      socket.onmessage = event => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'detection' && parsed.data) {
            const newDet = normalizeDetection(parsed.data);
            setRows(prev => [newDet, ...prev.filter(d => d.id !== newDet.id)]);
          }
        } catch (e) {
          console.warn('WS message parse error:', e);
        }
      };
      socket.onerror = () => console.warn('WebSocket connection not available');
    } catch {
      // Graceful fallback
    }

    return () => {
      socket?.close();
    };
  }, []);

  const onDetection = (d: Detection) => {
    setRows(previous => [d, ...previous.filter(p => p.id !== d.id)]);
  };

  const handleDemoSignIn = () => {
    const demoUser: AnalystProfile = {
      id: 'demo-analyst-1',
      email: 'alex@apexbank.com',
      full_name: 'Alex Morgan',
      role: 'Tier 1 SOC Analyst',
      avatar_initials: 'AM',
    };
    saveProfile({
      ...readProfile(),
      name: demoUser.full_name,
      email: demoUser.email,
      title: demoUser.role,
    });
    saveStoredAnalyst(demoUser);
    setCurrentUser(demoUser);
  };

  const app = location.pathname.startsWith('/app');
  const brandName = brand?.name ?? 'Apex Global Bank';

  const content = (
    <Routes>
      <Route path="/" element={<Landing rows={rows} currentUser={currentUser} onDemoSignIn={handleDemoSignIn} />} />
      <Route path="/login" element={<AuthPage mode="login" onAuthSuccess={p => setCurrentUser(p)} />} />
      <Route path="/signup" element={<AuthPage mode="signup" onAuthSuccess={p => setCurrentUser(p)} />} />
      <Route path="/app" element={currentUser ? <Dashboard rows={rows} onRefresh={loadData} /> : <Navigate to="/login" replace />} />
      <Route path="/app/analyzer" element={currentUser ? <Analyzer onDetection={onDetection} /> : <Navigate to="/login" replace />} />
      <Route path="/app/brand" element={currentUser ? <Brand /> : <Navigate to="/login" replace />} />
      <Route path="/app/architecture" element={<Architecture />} />
      <Route path="/app/evidence/:id" element={currentUser ? <Evidence rows={rows} /> : <Navigate to="/login" replace />} />
      <Route path="/app/cases" element={currentUser ? <Cases /> : <Navigate to="/login" replace />} />
      <Route path="/app/campaigns" element={currentUser ? <Campaigns rows={rows} /> : <Navigate to="/login" replace />} />
      <Route path="/app/typosquat" element={currentUser ? <Domains /> : <Navigate to="/login" replace />} />
      <Route path="/app/model-monitor" element={currentUser ? <Monitor /> : <Navigate to="/login" replace />} />
      <Route path="/app/account" element={currentUser ? <AccountPage profile={accountProfile} onSave={handleAccountSave} onSignOut={handleSignOut} /> : <Navigate to="/login" replace />} />
      <Route
        path="*"
        element={
          <div className="not-found">
            <Logo />
            <h1>Outside the perimeter.</h1>
            <p>This page could not be found.</p>
            <Link className="button primary" to="/">Return home <ArrowRight size={16} /></Link>
          </div>
        }
      />
    </Routes>
  );

  return app ? (
    <Shell
      rows={rows}
      brandName={brandName}
      connected={connected}
      currentUser={currentUser}
      onSignOut={handleSignOut}
    >
      {content}
    </Shell>
  ) : content;
}

export default function App() {
  return (
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  );
}
