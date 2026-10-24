import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ notices: 0, events: 0, opportunities: 0, complaints: 0 })
  const [recentNotices, setRecentNotices] = useState([])
  const [recentComplaints, setRecentComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/notices'),
      api.get('/events'),
      api.get('/opportunities'),
      api.get('/complaints'),
    ]).then(([n, e, o, c]) => {
      setStats({ notices: n.data.data.length, events: e.data.data.length, opportunities: o.data.data.length, complaints: c.data.data.length })
      setRecentNotices(n.data.data.slice(0, 3))
      setRecentComplaints(c.data.data.slice(0, 4))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const QUICK = [
    { icon: '📢', label: 'Published Notices', val: stats.notices, color: 'stat-icon-green', path: '/notices' },
    { icon: '📅', label: 'Events', val: stats.events, color: 'stat-icon-blue', path: '/events' },
    { icon: '💼', label: 'Opportunities', val: stats.opportunities, color: 'stat-icon-yellow', path: '/opportunities' },
    { icon: '💬', label: 'Complaints', val: stats.complaints, color: 'stat-icon-coral', path: '/complaints' },
  ]

  const ACTIONS = [
    { label: 'Write Notice', icon: '📢', desc: 'Post or AI-draft an announcement', action: () => navigate('/notices'), color: 'var(--forest)' },
    { label: 'Create Event', icon: '📅', desc: 'Schedule a campus event', action: () => navigate('/events'), color: '#3a7bd5' },
    { label: 'Post Opportunity', icon: '💼', desc: 'Add a placement listing', action: () => navigate('/opportunities'), color: 'var(--coral)' },
    { label: 'AI Tools', icon: '✨', desc: 'Rewrite notices & teaching plans', action: () => navigate('/ai-tools'), color: '#7a1a80' },
  ]

  const complaintStatus = { submitted: 'badge-coral', in_progress: 'badge-yellow', resolved: 'badge-green' }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="container">
          <h1>Teacher Dashboard 🎓</h1>
          <p>Welcome back, {user.name}. Manage your classroom from here.</p>
        </div>
      </div>
      <div className="page-content">
        <div className="container">
          {loading ? <div className="spinner" /> : (
            <>
              <div className="grid-4 anim-fade-up" style={{ marginBottom: 36 }}>
                {QUICK.map((q, i) => (
                  <div key={q.label} className={`stat-card delay-${i + 1}`} style={{ cursor: 'pointer' }} onClick={() => navigate(q.path)}>
                    <div className={`stat-icon ${q.color}`}>{q.icon}</div>
                    <div>
                      <div className="stat-number">{q.val}</div>
                      <div className="stat-label">{q.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <h2 className="section-title" style={{ marginBottom: 16 }}>Quick Actions</h2>
              <div className="grid-4 anim-fade-up" style={{ marginBottom: 40 }}>
                {ACTIONS.map((a, i) => (
                  <div key={a.label} className={`card delay-${i + 1}`} style={{ cursor: 'pointer', borderTop: `4px solid ${a.color}` }} onClick={a.action}>
                    <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>{a.icon}</div>
                    <h3 style={{ fontSize: '1rem', color: 'var(--forest)', marginBottom: 6 }}>{a.label}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>{a.desc}</p>
                  </div>
                ))}
              </div>

              <div className="grid-2" style={{ gap: 28 }}>
                {/* Recent notices */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 className="section-title">Recent Notices</h2>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/notices')}>Manage</button>
                  </div>
                  {recentNotices.length ? recentNotices.map((n, i) => (
                    <div key={n._id} className={`notice-card anim-fade-up delay-${i + 1}`} style={{ marginBottom: 14 }}>
                      <h3>{n.title}</h3>
                      <p>{n.content.slice(0, 100)}…</p>
                      <div className="notice-meta">
                        <span>📅 {new Date(n.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        <span className="badge badge-green">published</span>
                      </div>
                    </div>
                  )) : <div className="empty-state"><div className="empty-icon">📢</div><p>No notices yet</p></div>}
                </div>

                {/* Recent complaints */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 className="section-title">Recent Complaints</h2>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/complaints')}>Manage</button>
                  </div>
                  {recentComplaints.length ? recentComplaints.map((c, i) => (
                    <div key={c._id} className={`card anim-fade-up delay-${i + 1}`} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--forest)', marginBottom: 2 }}>{c.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>{c.studentId?.name} · <span style={{ textTransform: 'capitalize' }}>{c.category}</span></div>
                      </div>
                      <span className={`badge ${complaintStatus[c.status] || 'badge-gray'}`}>{c.status}</span>
                    </div>
                  )) : <div className="empty-state" style={{ padding: '24px' }}><div className="empty-icon">💬</div><p>No complaints yet</p></div>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
