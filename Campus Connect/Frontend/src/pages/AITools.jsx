import { useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function AITools() {
  const [tab, setTab] = useState('notice')
  // Notice rewriter
  const [rawText, setRawText] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  // Teaching plan
  const [plan, setPlan] = useState({ subject: '', topics: '', startDate: '', endDate: '', classesPerWeek: 3 })
  const [planResult, setPlanResult] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRewrite = async (e) => {
    e.preventDefault(); setError(''); setAiLoading(true); setAiResult(null)
    try {
      const r = await api.post('/ai/rewrite-notice', { rawText })
      setAiResult(r.data.data)
    } catch (err) { setError(err.response?.data?.message || 'AI rewrite failed') }
    finally { setAiLoading(false) }
  }

  const handleGeneratePlan = async (e) => {
    e.preventDefault(); setError(''); setPlanLoading(true); setPlanResult(null)
    try {
      const topicsArr = plan.topics.split(',').map(t => t.trim()).filter(Boolean)
      const r = await api.post('/teaching-plans/generate', {
        subject: plan.subject,
        topics: topicsArr,
        startDate: plan.startDate,
        endDate: plan.endDate,
        classesPerWeek: Number(plan.classesPerWeek),
      })
      setPlanResult(r.data.data)
    } catch (err) { setError(err.response?.data?.message || 'Plan generation failed') }
    finally { setPlanLoading(false) }
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="container">
          <h1>✨ AI Tools</h1>
          <p>Powered by Gemini — Rewrite notices and generate teaching roadmaps</p>
        </div>
      </div>
      <div className="page-content">
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="tabs">
            <button className={`tab-btn ${tab === 'notice' ? 'active' : ''}`} onClick={() => setTab('notice')}>📢 Notice Rewriter</button>
            <button className={`tab-btn ${tab === 'plan' ? 'active' : ''}`} onClick={() => setTab('plan')}>📚 Teaching Roadmap</button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {tab === 'notice' && (
            <div className="anim-fade-up">
              <div className="card" style={{ marginBottom: 20 }}>
                <h2 className="section-title" style={{ marginBottom: 4 }}>AI Notice Rewriter</h2>
                <p className="section-sub">Paste rough text — AI will transform it into a professional announcement draft.</p>
                <form onSubmit={handleRewrite}>
                  <div className="form-group">
                    <label className="form-label">Raw Text</label>
                    <textarea className="form-textarea" rows={5}
                      placeholder="e.g. 'exam postponed 2 days students bring hall ticket mandatory pen pencil'"
                      value={rawText} onChange={e => setRawText(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-coral" disabled={aiLoading}>
                    {aiLoading ? '✨ Rewriting with AI…' : '✨ Rewrite Notice'}
                  </button>
                </form>
              </div>
              {aiResult && (
                <div className="card anim-fade-up" style={{ borderTop: '4px solid var(--forest-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ color: 'var(--forest)' }}>AI-Generated Draft</h3>
                    <span className="badge badge-yellow">Draft — Review before publishing</span>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontFamily: 'Playfair Display', color: 'var(--forest)', marginBottom: 10 }}>{aiResult.title}</h4>
                  <p style={{ color: 'var(--text-mid)', lineHeight: 1.8, fontSize: '0.95rem' }}>{aiResult.content}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'plan' && (
            <div className="anim-fade-up">
              <div className="card" style={{ marginBottom: 20 }}>
                <h2 className="section-title" style={{ marginBottom: 4 }}>Teaching Roadmap Generator</h2>
                <p className="section-sub">Enter your subject and topics — AI will build a complete session schedule.</p>
                <form onSubmit={handleGeneratePlan}>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input className="form-input" placeholder="e.g. Data Structures and Algorithms"
                      value={plan.subject} onChange={e => setPlan(p => ({ ...p, subject: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Topics (comma-separated)</label>
                    <textarea className="form-textarea" rows={2}
                      placeholder="Graphs, Minimum Spanning Trees, Backtracking, Dynamic Programming"
                      value={plan.topics} onChange={e => setPlan(p => ({ ...p, topics: e.target.value }))} required />
                  </div>
                  <div className="grid-3">
                    <div className="form-group">
                      <label className="form-label">Start Date</label>
                      <input className="form-input" type="date" value={plan.startDate} onChange={e => setPlan(p => ({ ...p, startDate: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input className="form-input" type="date" value={plan.endDate} onChange={e => setPlan(p => ({ ...p, endDate: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Classes/Week</label>
                      <select className="form-select" value={plan.classesPerWeek} onChange={e => setPlan(p => ({ ...p, classesPerWeek: e.target.value }))}>
                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-coral" disabled={planLoading}>
                    {planLoading ? '✨ Generating Plan…' : '✨ Generate Teaching Plan'}
                  </button>
                </form>
              </div>

              {planResult && (
                <div className="card anim-fade-up">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ color: 'var(--forest)' }}>{planResult.subject} — Schedule</h3>
                    <span className="badge badge-yellow">AI Suggestion</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 20, fontStyle: 'italic' }}>{planResult.disclaimer}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {planResult.schedule?.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 16px', background: i % 2 === 0 ? 'var(--sage-light)' : 'var(--white)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--cream-dark)' }}>
                        <div style={{ minWidth: 70, fontSize: '0.78rem', fontWeight: 600, color: 'var(--forest)', textAlign: 'center', paddingTop: 2 }}>
                          {new Date(s.plannedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)', marginBottom: 2 }}>{s.topic}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>{s.sessionObjective}</div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <span className={`badge ${s.completed ? 'badge-green' : 'badge-gray'}`}>{s.completed ? '✓ Done' : 'Pending'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
