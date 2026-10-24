import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

const statusColor = { saved: 'badge-gray', applied: 'badge-blue', shortlisted: 'badge-yellow', rejected: 'badge-coral', selected: 'badge-green' }

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/student')
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const s = data?.summary || {}

  const QUICK = [
    { icon: '📢', label: 'Notices', val: data?.notices?.length ?? '—', color: 'stat-icon-green', path: '/notices' },
    { icon: '📅', label: 'Upcoming Events', val: s.upcomingEvents ?? '—', color: 'stat-icon-blue', path: '/events' },
    { icon: '💼', label: 'Opportunities', val: s.availableOpportunities ?? '—', color: 'stat-icon-yellow', path: '/opportunities' },
    { icon: '📋', label: 'Active Applications', val: s.activeApplications ?? '—', color: 'stat-icon-coral', path: '/applications' },
  ]

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="container">
          <h1>Hello, {user.name.split(' ')[0]} 👋</h1>
          <p>Here's what's happening on your campus today.</p>
        </div>
      </div>
      <div className="page-content">
        <div className="container">
          {loading ? <div className="spinner" /> : (
            <>
              {/* Stats */}
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

              <div className="grid-2" style={{ gap: 28 }}>
                {/* Latest Notices */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 className="section-title">Latest Notices</h2>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/notices')}>View All</button>
                  </div>
                  {data?.notices?.length ? data.notices.slice(0, 3).map((n, i) => (
                    <div key={n._id} className={`notice-card anim-fade-up delay-${i + 1}`} style={{ marginBottom: 14 }}>
                      <h3>{n.title}</h3>
                      <p>{n.content.slice(0, 120)}{n.content.length > 120 ? '…' : ''}</p>
                      <div className="notice-meta">
                        <span>📅 {new Date(n.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        <span>by {n.createdBy?.name}</span>
                      </div>
                    </div>
                  )) : <div className="empty-state"><div className="empty-icon">📢</div><p>No notices yet</p></div>}
                </div>

                {/* Right column */}
                <div>
                  {/* Upcoming Events */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h2 className="section-title">Upcoming Events</h2>
                      <button className="btn btn-outline btn-sm" onClick={() => navigate('/events')}>View All</button>
                    </div>
                    {data?.events?.length ? data.events.slice(0, 2).map((ev, i) => (
                      <div key={ev._id} className={`event-card anim-fade-up delay-${i + 1}`} style={{ display: 'flex', marginBottom: 14 }}>
                        <div className="event-date-block">
                          <div className="event-day">{new Date(ev.eventDate).getDate()}</div>
                          <div className="event-month">{new Date(ev.eventDate).toLocaleString('en', { month: 'short' })}</div>
                        </div>
                        <div className="event-body">
                          <h3>{ev.title}</h3>
                          <p>📍 {ev.location}</p>
                        </div>
                      </div>
                    )) : <div className="empty-state" style={{ padding: '24px' }}><div className="empty-icon">📅</div><p>No upcoming events</p></div>}
                  </div>

                  {/* My Applications */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h2 className="section-title">My Applications</h2>
                      <button className="btn btn-outline btn-sm" onClick={() => navigate('/applications')}>View All</button>
                    </div>
                    {data?.applications?.length ? data.applications.slice(0, 3).map((a, i) => (
                      <div key={a._id} className={`card anim-fade-up delay-${i + 1}`} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--forest)' }}>{a.opportunityId?.company}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>{a.opportunityId?.role}</div>
                        </div>
                        <span className={`badge ${statusColor[a.status] || 'badge-gray'}`}>{a.status}</span>
                      </div>
                    )) : <div className="empty-state" style={{ padding: '24px' }}><div className="empty-icon">📋</div><p>No applications yet</p></div>}
                  </div>
                </div>
              </div>

              {/* Deadline alerts */}
              {data?.upcomingDeadlines?.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <h2 className="section-title">⚠️ Deadlines in 7 Days</h2>
                  <div className="grid-3" style={{ marginTop: 16 }}>
                    {data.upcomingDeadlines.map((d, i) => (
                      <div key={d.applicationId} className={`card anim-fade-up delay-${i + 1}`} style={{ borderLeft: '4px solid var(--coral)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--forest)' }}>{d.company}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', margin: '4px 0' }}>{d.role}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--coral)', fontWeight: 600 }}>
                          🗓 {new Date(d.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
