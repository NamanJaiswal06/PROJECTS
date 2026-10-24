import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const user = await register(form.name, form.email, form.password, form.role)
      navigate(user.role === 'teacher' ? '/teacher' : '/student')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="blob blob-green" style={{ width: 300, height: 300, top: -60, left: -60 }} />
        <div className="blob blob-coral" style={{ width: 200, height: 200, bottom: 80, right: 40 }} />
        <div className="auth-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="navbar-brand">Campus<span>Connect</span></span>
        </div>
        <div className="auth-left-content">
          <h2 className="auth-left-title">Join your<br /><em>campus.</em></h2>
          <p className="auth-left-sub">
            Create your account to access all campus features — from notices and events to AI-powered placement prep.
          </p>
          <div className="auth-perks">
            {['📢 Real-time notices', '💼 Placement opportunities', '🎯 AI quiz preparation', '💬 Complaint tracking'].map(p => (
              <div key={p} className="auth-perk">{p}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-box anim-fade-up">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-sub">Join Campus Connect today</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="Rahul Verma"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">I am a</label>
              <div className="role-toggle">
                <button type="button"
                  className={`role-btn ${form.role === 'student' ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, role: 'student' }))}>
                  👨‍🎓 Student
                </button>
                <button type="button"
                  className={`role-btn ${form.role === 'teacher' ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, role: 'teacher' }))}>
                  👨‍🏫 Teacher
                </button>
              </div>
            </div>
            <button className="btn btn-coral" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Creating account…' : 'Create Account →'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
