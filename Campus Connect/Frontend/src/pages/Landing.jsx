import { useNavigate } from 'react-router-dom'
import './Landing.css'

const FEATURES = [
  { icon: '📢', title: 'Notices', desc: 'Real-time announcements from your college, always up to date.', color: 'var(--forest)' },
  { icon: '📅', title: 'Events', desc: 'Stay informed about workshops, seminars, and campus activities.', color: 'var(--coral)' },
  { icon: '💼', title: 'Placements', desc: 'Discover internships and job opportunities tailored for students.', color: '#3a7bd5' },
  { icon: '💬', title: 'Complaints', desc: 'Raise concerns and track resolutions transparently.', color: '#7a5a00' },
  { icon: '🎯', title: 'AI Quiz Prep', desc: 'Practice with AI-generated questions for your dream placement.', color: '#5a1a80' },
  { icon: '✨', title: 'AI Tools', desc: 'Rewrite notices and generate teaching roadmaps instantly.', color: 'var(--forest-light)' },
]

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="blob blob-green" style={{ width: 400, height: 400, top: -100, right: -100 }} />
        <div className="blob blob-coral" style={{ width: 300, height: 300, bottom: -80, left: -80 }} />
        <div className="container hero-inner">
          <div className="hero-text anim-fade-up">
            <div className="hero-eyebrow">🎓 One Classroom. Infinite Possibilities.</div>
            <h1 className="hero-title">
              Your Campus,<br />
              <em>Connected.</em>
            </h1>
            <p className="hero-subtitle">
              Bridging students, faculty, and resources on a single platform.
              Access announcements, events, career opportunities, and provide
              feedback — effortlessly.
            </p>
            <div className="hero-cta">
              <button className="btn btn-coral btn-lg" onClick={() => navigate('/register')}>
                Get Started Free →
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
          </div>
          <div className="hero-visual anim-fade-up delay-2">
            <div className="hero-card-stack">
              <div className="hero-card hc-1">
                <span>📢</span>
                <div>
                  <div className="hc-title">Mid-sem Exam Schedule</div>
                  <div className="hc-sub">Just published · 2 min ago</div>
                </div>
              </div>
              <div className="hero-card hc-2">
                <span>💼</span>
                <div>
                  <div className="hc-title">Software Intern — Acme Corp</div>
                  <div className="hc-sub">Deadline: Oct 20 · ₹15k/mo</div>
                </div>
              </div>
              <div className="hero-card hc-3">
                <span>🎯</span>
                <div>
                  <div className="hc-title">Quiz Score: 80%</div>
                  <div className="hc-sub">Data Structures · AI Generated</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-bar">
        <div className="container stats-inner">
          {[['24+', 'API Endpoints'], ['6', 'Core Modules'], ['AI', 'Powered Tools'], ['Real-time', 'Updates']].map(([val, label]) => (
            <div key={label} className="stat-pill">
              <span className="stat-pill-val">{val}</span>
              <span className="stat-pill-label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="section-eyebrow">Platform Modules</div>
            <h2 className="features-title">Our <em>Works</em></h2>
            <p style={{ color: 'var(--text-soft)', maxWidth: 480, margin: '12px auto 0' }}>
              Every feature designed for a seamless college experience.
            </p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`feature-card anim-fade-up delay-${i + 1}`}>
                <div className="feature-icon" style={{ color: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className="cta-title">Ready to connect your campus?</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 32 }}>
            Join as a student or teacher. Demo accounts available for instant access.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-coral btn-lg" onClick={() => navigate('/register')}>Create Account</button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate('/login')}>Sign In →</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="navbar-brand">Campus<span>Connect</span></span>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: 12 }}>
            Built for one classroom. Powered by Node.js, MongoDB & Gemini AI.
          </p>
        </div>
      </footer>
    </div>
  )
}
