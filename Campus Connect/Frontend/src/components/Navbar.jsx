import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STUDENT_NAV = [
  { label: 'Dashboard', path: '/student', icon: '⊞' },
  { label: 'Notices', path: '/notices', icon: '📢' },
  { label: 'Events', path: '/events', icon: '📅' },
  { label: 'Opportunities', path: '/opportunities', icon: '💼' },
  { label: 'My Applications', path: '/applications', icon: '📋' },
  { label: 'Complaints', path: '/complaints', icon: '💬' },
  { label: 'Quiz Prep', path: '/placement-prep', icon: '🎯' },
]

const TEACHER_NAV = [
  { label: 'Dashboard', path: '/teacher', icon: '⊞' },
  { label: 'Notices', path: '/notices', icon: '📢' },
  { label: 'Events', path: '/events', icon: '📅' },
  { label: 'Opportunities', path: '/opportunities', icon: '💼' },
  { label: 'Complaints', path: '/complaints', icon: '💬' },
  { label: 'AI Tools', path: '/ai-tools', icon: '✨' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  const navItems = user.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <span className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Campus<span>Connect</span>
        </span>

        <div className="navbar-nav" style={{ display: menuOpen ? 'flex' : undefined }}>
          {navItems.map(item => (
            <span
              key={item.path}
              className={`nav-link ${pathname === item.path ? 'active' : ''}`}
              onClick={() => { navigate(item.path); setMenuOpen(false) }}
            >
              <span style={{ marginRight: 4, fontSize: '0.9em' }}>{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>

        <div className="navbar-right">
          <div className="user-pill">
            <div className="user-avatar">{initials}</div>
            <span>{user.name.split(' ')[0]}</span>
            <span style={{ opacity: 0.5, fontSize: '0.75rem', textTransform: 'capitalize' }}>
              · {user.role}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>
    </nav>
  )
}
