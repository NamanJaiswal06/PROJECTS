import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function Notices() {
  const { user } = useAuth()
  const isTeacher = user?.role === 'teacher'
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [aiModal, setAiModal] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', status: 'draft' })
  const [rawText, setRawText] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/notices').then(r => setNotices(r.data.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      await api.post('/notices', form)
      setSuccess('Notice created!'); setShowModal(false)
      setForm({ title: '', content: '', status: 'draft' }); load()
    } catch (err) { setError(err.response?.data?.message || 'Failed to create notice') }
    finally { setSubmitting(false) }
  }

  const handlePublish = async (id) => {
    try { await api.patch(`/notices/${id}/publish`); setSuccess('Notice published!'); load() }
    catch (err) { setError(err.response?.data?.message || 'Failed to publish') }
  }

  const handleAiRewrite = async (e) => {
    e.preventDefault(); setAiLoading(true); setAiResult(null)
    try {
      const r = await api.post('/ai/rewrite-notice', { rawText })
      setAiResult(r.data.data)
    } catch (err) { setError(err.response?.data?.message || 'AI rewrite failed') }
    finally { setAiLoading(false) }
  }

  const useAiResult = () => {
    setForm({ title: aiResult.title, content: aiResult.content, status: 'draft' })
    setAiModal(false); setShowModal(true); setAiResult(null); setRawText('')
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>📢 Notices</h1>
            <p>{isTeacher ? 'Manage campus announcements' : 'Stay updated with campus news'}</p>
          </div>
          {isTeacher && (
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setAiModal(true)}>✨ AI Draft</button>
              <button className="btn btn-coral" onClick={() => setShowModal(true)}>+ New Notice</button>
            </div>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          {success && <div className="alert alert-success">{success}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {loading ? <div className="spinner" /> : notices.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {notices.map((n, i) => (
                <div key={n._id} className={`notice-card anim-fade-up delay-${Math.min(i + 1, 5)}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h3>{n.title}</h3>
                      <p style={{ marginTop: 8 }}>{n.content}</p>
                      <div className="notice-meta">
                        <span>📅 {new Date(n.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <span>by {n.createdBy?.name}</span>
                        <span className="badge badge-green">published</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📢</div>
              <h3>No notices yet</h3>
              <p>{isTeacher ? 'Create your first notice to get started.' : 'No published notices at this time.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Notice</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" placeholder="Notice title"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea className="form-textarea" rows={5} placeholder="Notice content…"
                  value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create Notice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {aiModal && (
        <div className="modal-overlay" onClick={() => setAiModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✨ AI Notice Rewriter</h2>
              <button className="modal-close" onClick={() => setAiModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAiRewrite}>
              <div className="form-group">
                <label className="form-label">Raw Text</label>
                <textarea className="form-textarea" rows={4} placeholder="e.g. exam tmr hall ticket needed bring pen"
                  value={rawText} onChange={e => setRawText(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-coral" disabled={aiLoading} style={{ width: '100%', justifyContent: 'center' }}>
                {aiLoading ? '✨ Rewriting…' : '✨ Rewrite with AI'}
              </button>
            </form>
            {aiResult && (
              <div style={{ marginTop: 24, padding: 18, background: 'var(--sage-light)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, color: 'var(--forest)', marginBottom: 6 }}>{aiResult.title}</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-mid)', lineHeight: 1.7 }}>{aiResult.content}</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={useAiResult}>
                  Use this Draft →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
