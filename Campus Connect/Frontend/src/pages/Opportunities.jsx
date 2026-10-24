import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function Opportunities() {
  const { user } = useAuth()
  const isTeacher = user?.role === 'teacher'
  const [opps, setOpps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [applyingId, setApplyingId] = useState(null)
  const [form, setForm] = useState({ company: '', role: '', description: '', eligibility: '', packageOrStipend: '', deadline: '', applicationLink: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => { setLoading(true); api.get('/opportunities').then(r => setOpps(r.data.data)).finally(() => setLoading(false)) }
  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      await api.post('/opportunities', { ...form, deadline: new Date(form.deadline).toISOString() })
      setSuccess('Opportunity posted!'); setShowModal(false)
      setForm({ company: '', role: '', description: '', eligibility: '', packageOrStipend: '', deadline: '', applicationLink: '' }); load()
    } catch (err) { setError(err.response?.data?.message || 'Failed to post opportunity') }
    finally { setSubmitting(false) }
  }

  const handleApply = async (opportunityId) => {
    setApplyingId(opportunityId)
    try {
      await api.post('/applications', { opportunityId, status: 'applied' })
      setSuccess('Application submitted successfully!')
    } catch (err) {
      if (err.response?.status === 409) setError('You have already applied to this opportunity.')
      else setError(err.response?.data?.message || 'Application failed')
    } finally { setApplyingId(null) }
  }

  const daysLeft = (deadline) => {
    const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { text: 'Closed', color: 'badge-gray' }
    if (diff <= 3) return { text: `${diff}d left`, color: 'badge-coral' }
    if (diff <= 7) return { text: `${diff}d left`, color: 'badge-yellow' }
    return { text: `${diff}d left`, color: 'badge-green' }
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h1>💼 Opportunities</h1><p>Placement and internship listings</p></div>
          {isTeacher && <button className="btn btn-coral" style={{ marginTop: 8 }} onClick={() => setShowModal(true)}>+ Post Opportunity</button>}
        </div>
      </div>
      <div className="page-content">
        <div className="container">
          {success && <div className="alert alert-success">{success}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? <div className="spinner" /> : opps.length ? (
            <div className="grid-3">
              {opps.map((o, i) => {
                const d = daysLeft(o.deadline)
                return (
                  <div key={o._id} className={`opp-card anim-fade-up delay-${Math.min(i + 1, 5)}`}>
                    <div className="opp-company">{o.company}</div>
                    <div className="opp-role">{o.role}</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginBottom: 14, lineHeight: 1.6 }}>
                      {o.description.slice(0, 100)}{o.description.length > 100 ? '…' : ''}
                    </p>
                    <div style={{ marginBottom: 14 }}>
                      <span className="opp-tag">👤 {o.eligibility}</span>
                      <span className="opp-tag">💰 {o.packageOrStipend}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span className={`badge ${d.color}`}>{d.text}</span>
                      {!isTeacher ? (
                        <button className="btn btn-primary btn-sm" disabled={applyingId === o._id || d.text === 'Closed'}
                          onClick={() => handleApply(o._id)}>
                          {applyingId === o._id ? 'Applying…' : 'Apply'}
                        </button>
                      ) : (
                        <a href={o.applicationLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">View →</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💼</div>
              <h3>No opportunities yet</h3>
              <p>{isTeacher ? 'Post your first placement listing.' : 'Check back soon for new openings!'}</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Post Opportunity</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="grid-2">
                {[
                  { label: 'Company', key: 'company', placeholder: 'Tech Corp Ltd' },
                  { label: 'Role', key: 'role', placeholder: 'Software Engineer Intern' },
                  { label: 'Eligibility', key: 'eligibility', placeholder: 'CSE/IT 2nd year+' },
                  { label: 'Package / Stipend', key: 'packageOrStipend', placeholder: '₹15,000/month' },
                ].map(f => (
                  <div key={f.key} className="form-group">
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" placeholder={f.placeholder}
                      value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} required />
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={3} placeholder="Job description…"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Application Deadline</label>
                  <input className="form-input" type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Application Link</label>
                  <input className="form-input" type="url" placeholder="https://apply.example.com"
                    value={form.applicationLink} onChange={e => setForm(p => ({ ...p, applicationLink: e.target.value }))} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-coral" disabled={submitting}>{submitting ? 'Posting…' : 'Post Opportunity'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
