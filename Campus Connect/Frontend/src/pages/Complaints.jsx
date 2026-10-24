import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

const CAT_COLORS = { academic: 'badge-blue', facilities: 'badge-yellow', administration: 'badge-purple', other: 'badge-gray' }
const STATUS_COLORS = { submitted: 'badge-coral', in_progress: 'badge-yellow', resolved: 'badge-green' }

export default function Complaints() {
  const { user } = useAuth()
  const isTeacher = user?.role === 'teacher'
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [resolveModal, setResolveModal] = useState(null) // complaint obj
  const [form, setForm] = useState({ title: '', description: '', category: 'facilities' })
  const [resolveForm, setResolveForm] = useState({ status: 'in_progress', teacherResponse: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => {
    setLoading(true)
    const url = isTeacher ? '/complaints' : '/complaints/mine'
    api.get(url).then(r => setComplaints(r.data.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      await api.post('/complaints', form)
      setSuccess('Complaint submitted successfully!'); setShowModal(false)
      setForm({ title: '', description: '', category: 'facilities' }); load()
    } catch (err) { setError(err.response?.data?.message || 'Submission failed') }
    finally { setSubmitting(false) }
  }

  const handleResolve = async (e) => {
    e.preventDefault(); setSubmitting(true)
    try {
      await api.patch(`/complaints/${resolveModal._id}/status`, resolveForm)
      setSuccess('Complaint updated!'); setResolveModal(null); load()
    } catch (err) { setError(err.response?.data?.message || 'Update failed') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>💬 Complaints</h1>
            <p>{isTeacher ? 'Review and respond to student complaints' : 'Submit and track your complaints'}</p>
          </div>
          {!isTeacher && <button className="btn btn-coral" style={{ marginTop: 8 }} onClick={() => setShowModal(true)}>+ Submit Complaint</button>}
        </div>
      </div>
      <div className="page-content">
        <div className="container">
          {success && <div className="alert alert-success">{success}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? <div className="spinner" /> : complaints.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {complaints.map((c, i) => (
                <div key={c._id} className={`card anim-fade-up delay-${Math.min(i + 1, 5)}`} style={{ borderLeft: '4px solid var(--forest-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--forest)' }}>{c.title}</h3>
                        <span className={`badge ${CAT_COLORS[c.category] || 'badge-gray'}`}>{c.category}</span>
                        <span className={`badge ${STATUS_COLORS[c.status] || 'badge-gray'}`}>{c.status}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-soft)', lineHeight: 1.7 }}>{c.description}</p>
                      {c.teacherResponse && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--sage-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--forest)' }}>
                          <strong>Teacher Response:</strong> {c.teacherResponse}
                        </div>
                      )}
                      <div className="notice-meta" style={{ marginTop: 10 }}>
                        <span>{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {isTeacher && c.studentId?.name && <span>by {c.studentId.name}</span>}
                      </div>
                    </div>
                    {isTeacher && c.status !== 'resolved' && (
                      <button className="btn btn-outline btn-sm" onClick={() => { setResolveModal(c); setResolveForm({ status: 'in_progress', teacherResponse: c.teacherResponse || '' }) }}>
                        Respond
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>No complaints</h3>
              <p>{isTeacher ? 'No complaints to review.' : 'Submit a complaint if you have any issues.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Submit Complaint</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" placeholder="Brief issue title"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="academic">Academic</option>
                  <option value="facilities">Facilities</option>
                  <option value="administration">Administration</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={4} placeholder="Describe the issue in detail…"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-coral" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="modal-overlay" onClick={() => setResolveModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Respond to Complaint</h2>
              <button className="modal-close" onClick={() => setResolveModal(null)}>✕</button>
            </div>
            <div style={{ background: 'var(--sage-light)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, fontSize: '0.9rem', color: 'var(--forest)' }}>
              <strong>{resolveModal.title}</strong><br />
              <span style={{ color: 'var(--text-soft)', fontSize: '0.82rem' }}>{resolveModal.description}</span>
            </div>
            <form onSubmit={handleResolve}>
              <div className="form-group">
                <label className="form-label">Update Status</label>
                <select className="form-select" value={resolveForm.status} onChange={e => setResolveForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Response (optional)</label>
                <textarea className="form-textarea" rows={3} placeholder="Your response to the student…"
                  value={resolveForm.teacherResponse} onChange={e => setResolveForm(f => ({ ...f, teacherResponse: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setResolveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Updating…' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
