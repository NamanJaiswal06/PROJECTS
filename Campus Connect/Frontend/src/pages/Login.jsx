import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const user = await login(form.email, form.password)
      navigate(user.role === 'teacher' ? '/teacher' : '/student')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    if (role === 'teacher') setForm({ email: 'teacher@campusconnect.dev', password: 'Teacher@123' })
    else setForm({ email: 'student1@campusconnect.dev', password: 'Student@123' })
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
          <h2 className="auth-left-title">Welcome<br /><em>back.</em></h2>
          <p className="auth-left-sub">
            Your campus portal awaits. Sign in to access notices, events, opportunities, and more.
          </p>
          <div className="auth-demo">
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>Quick demo access:</p>
            <button className="btn btn-ghost btn-sm" onClick={() => fillDemo('teacher')}>👨‍🏫 Teacher Demo</button>
            <button className="btn btn-ghost btn-sm" onClick={() => fillDemo('student')}>👨‍🎓 Student Demo</button>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-box anim-fade-up">
          <h1 className="auth-title">Sign In</h1>
          <p className="auth-sub">Enter your credentials to continue</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
