import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function Events() {
  const { user } = useAuth()
  const isTeacher = user?.role === 'teacher'
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', eventDate: '', location: '', registrationLink: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => { setLoading(true); api.get('/events').then(r => setEvents(r.data.data)).finally(() => setLoading(false)) }
  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      await api.post('/events', { ...form, eventDate: new Date(form.eventDate).toISOString() })
      setSuccess('Event created!'); setShowModal(false)
      setForm({ title: '', description: '', eventDate: '', location: '', registrationLink: '' }); load()
    } catch (err) { setError(err.response?.data?.message || 'Failed to create event') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h1>📅 Events</h1><p>Upcoming campus activities and workshops</p></div>
          {isTeacher && <button className="btn btn-coral" style={{ marginTop: 8 }} onClick={() => setShowModal(true)}>+ Add Event</button>}
        </div>
      </div>
      <div className="page-content">
        <div className="container">
          {success && <div className="alert alert-success">{success}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? <div className="spinner" /> : events.length ? (
            <div className="grid-3">
              {events.map((ev, i) => {
                const d = new Date(ev.eventDate)
                return (
                  <div key={ev._id} className={`event-card anim-fade-up delay-${Math.min(i + 1, 5)}`} style={{ display: 'flex' }}>
                    <div className="event-date-block">
                      <div className="event-day">{d.getDate()}</div>
                      <div className="event-month">{d.toLocaleString('en', { month: 'short' })}</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 2 }}>{d.getFullYear()}</div>
                    </div>
                    <div className="event-body">
                      <h3>{ev.title}</h3>
                      <p style={{ marginBottom: 6 }}>{ev.description.slice(0, 80)}{ev.description.length > 80 ? '…' : ''}</p>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>📍 {ev.location}</div>
                      {ev.registrationLink && (
                        <a href={ev.registrationLink} target="_blank" rel="noreferrer"
                          className="btn btn-outline btn-sm" style={{ marginTop: 10, display: 'inline-flex' }}>
                          Register →
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No upcoming events</h3>
              <p>{isTeacher ? 'Schedule your first event.' : 'Check back soon!'}</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Event</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              {[
                { label: 'Title', key: 'title', type: 'text', placeholder: 'Tech Workshop 2026' },
                { label: 'Location', key: 'location', type: 'text', placeholder: 'Main Auditorium' },
                { label: 'Event Date & Time', key: 'eventDate', type: 'datetime-local', placeholder: '' },
                { label: 'Registration Link (optional)', key: 'registrationLink', type: 'url', placeholder: 'https://forms.example.com' },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" type={f.type} placeholder={f.placeholder}
                    value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={f.key !== 'registrationLink'} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={3} placeholder="Event details…"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
