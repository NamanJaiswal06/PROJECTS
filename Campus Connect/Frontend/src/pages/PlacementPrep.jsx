import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function PlacementPrep() {
  const [opps, setOpps] = useState([])
  const [selectedOpp, setSelectedOpp] = useState('')
  const [numQ, setNumQ] = useState(5)
  const [session, setSession] = useState(null) // { sessionId, questions, expiresAt }
  const [answers, setAnswers] = useState({})   // { questionId: selectedIndex }
  const [result, setResult] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('setup') // 'setup' | 'quiz' | 'result'

  useEffect(() => {
    api.get('/opportunities').then(r => setOpps(r.data.data)).catch(() => {})
  }, [])

  const handleGenerate = async (e) => {
    e.preventDefault(); setError(''); setGenerating(true)
    try {
      const r = await api.post('/placement-prep/generate-quiz', {
        opportunityId: selectedOpp,
        numberOfQuestions: Number(numQ),
      })
      setSession(r.data.data)
      setAnswers({})
      setResult(null)
      setStep('quiz')
    } catch (err) { setError(err.response?.data?.message || 'Failed to generate quiz') }
    finally { setGenerating(false) }
  }

  const handleSubmitQuiz = async () => {
    if (Object.keys(answers).length < session.questions.length) {
      setError('Please answer all questions before submitting.'); return
    }
    setError(''); setSubmitting(true)
    try {
      const r = await api.post('/placement-prep/submit-quiz', {
        sessionId: session.sessionId,
        answers: Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({ questionId, selectedOptionIndex })),
      })
      setResult(r.data.data)
      setStep('result')
    } catch (err) { setError(err.response?.data?.message || 'Submission failed') }
    finally { setSubmitting(false) }
  }

  const scoreColor = (s) => s >= 80 ? '#1a6b35' : s >= 50 ? '#7a5a00' : '#b03020'
  const scoreBg = (s) => s >= 80 ? '#d4edda' : s >= 50 ? '#fff3cd' : '#ffe0d9'

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="container">
          <h1>🎯 Placement Quiz Prep</h1>
          <p>AI-generated practice questions to prepare for placement interviews</p>
        </div>
      </div>
      <div className="page-content">
        <div className="container" style={{ maxWidth: 760 }}>
          {error && <div className="alert alert-error">{error}</div>}

          {/* Step 1: Setup */}
          {step === 'setup' && (
            <div className="card anim-fade-up">
              <h2 className="section-title" style={{ marginBottom: 4 }}>Generate Practice Quiz</h2>
              <p className="section-sub">Select a placement opportunity to generate relevant practice questions.</p>
              <div style={{ padding: '12px 16px', background: 'var(--sage-light)', borderRadius: 'var(--radius-sm)', marginBottom: 24, fontSize: '0.85rem', color: 'var(--text-mid)' }}>
                ⚠️ These are AI-generated practice questions for preparation only. They are not official company interview questions.
              </div>
              <form onSubmit={handleGenerate}>
                <div className="form-group">
                  <label className="form-label">Select Opportunity</label>
                  <select className="form-select" value={selectedOpp} onChange={e => setSelectedOpp(e.target.value)} required>
                    <option value="">Choose a placement opportunity…</option>
                    {opps.map(o => <option key={o._id} value={o._id}>{o.company} — {o.role}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Number of Questions (1–15)</label>
                  <input className="form-input" type="number" min={1} max={15} value={numQ} onChange={e => setNumQ(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-coral btn-lg" disabled={generating} style={{ width: '100%', justifyContent: 'center' }}>
                  {generating ? '✨ Generating with AI…' : '🎯 Generate Quiz'}
                </button>
              </form>
            </div>
          )}

          {/* Step 2: Quiz */}
          {step === 'quiz' && session && (
            <div className="anim-fade-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 className="section-title">{session.opportunityRole} — Practice Quiz</h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>
                  {Object.keys(answers).length}/{session.questions.length} answered
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', fontStyle: 'italic', marginBottom: 20 }}>{session.disclaimer}</div>

              {session.questions.map((q, qi) => (
                <div key={q.questionId} className={`card anim-fade-up delay-${Math.min(qi + 1, 5)}`} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--forest)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}>{qi + 1}</div>
                    <p style={{ fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.6 }}>{q.questionText}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 38 }}>
                    {q.options.map((opt, oi) => (
                      <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: `2px solid ${answers[q.questionId] === oi ? 'var(--forest)' : 'var(--cream-dark)'}`, background: answers[q.questionId] === oi ? 'var(--sage-light)' : 'transparent', transition: 'var(--transition)', fontSize: '0.9rem', color: 'var(--text-mid)' }}>
                        <input type="radio" name={q.questionId} value={oi} checked={answers[q.questionId] === oi} onChange={() => setAnswers(a => ({ ...a, [q.questionId]: oi }))} style={{ display: 'none' }} />
                        <span style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${answers[q.questionId] === oi ? 'var(--forest)' : 'var(--sage-mid)'}`, background: answers[q.questionId] === oi ? 'var(--forest)' : 'transparent', flexShrink: 0 }} />
                        {opt}
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, paddingLeft: 38, fontSize: '0.75rem', color: 'var(--sage-mid)', textTransform: 'capitalize' }}>Topic: {q.topic}</div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-outline" onClick={() => setStep('setup')}>← Back</button>
                <button className="btn btn-coral btn-lg" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting} onClick={handleSubmitQuiz}>
                  {submitting ? 'Scoring…' : 'Submit Quiz →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && result && (
            <div className="anim-fade-up">
              <div className="card" style={{ textAlign: 'center', marginBottom: 24, borderTop: `4px solid ${scoreColor(result.score)}` }}>
                <div style={{ fontSize: '4rem', fontFamily: 'Playfair Display', fontWeight: 700, color: scoreColor(result.score), margin: '20px 0 8px' }}>{result.score}%</div>
                <div style={{ fontSize: '1.1rem', color: 'var(--text-mid)', marginBottom: 16 }}>
                  {result.correctCount} correct / {result.incorrectCount} incorrect out of {result.totalQuestions} questions
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {result.skillGaps.length > 0 && result.skillGaps.map(g => <span key={g} className="badge badge-coral">{g}</span>)}
                  {result.skillGaps.length === 0 && <span className="badge badge-green">Excellent performance!</span>}
                </div>
                {result.recommendedTopics.length > 0 && (
                  <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--sage-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--forest)' }}>
                    <strong>Recommended Practice: </strong>{result.recommendedTopics.join(', ')}
                  </div>
                )}
              </div>

              <h3 className="section-title" style={{ marginBottom: 14 }}>Detailed Results</h3>
              {result.detailedResults.map((r, i) => (
                <div key={r.questionId} className={`card anim-fade-up delay-${Math.min(i + 1, 5)}`} style={{ marginBottom: 14, borderLeft: `4px solid ${r.isCorrect ? '#2e7d4f' : 'var(--coral)'}` }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <span>{r.isCorrect ? '✅' : '❌'}</span>
                    <p style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem' }}>{r.questionText}</p>
                  </div>
                  <div style={{ paddingLeft: 28, fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                    <div>Your answer: <strong style={{ color: r.isCorrect ? '#1a6b35' : 'var(--coral)' }}>{r.yourAnswer}</strong></div>
                    {!r.isCorrect && <div>Correct answer: <strong style={{ color: '#1a6b35' }}>{r.correctAnswer}</strong></div>}
                    <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--cream-dark)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      💡 {r.explanation}
                    </div>
                  </div>
                </div>
              ))}

              <button className="btn btn-coral btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => { setStep('setup'); setSession(null); setResult(null) }}>
                🎯 Try Another Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
