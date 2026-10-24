import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api/axios'

const STATUS_COLORS = { saved: 'badge-gray', applied: 'badge-blue', shortlisted: 'badge-yellow', rejected: 'badge-coral', selected: 'badge-green' }

export default function Applications() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/applications/mine').then(r => setApps(r.data.data)).catch(() => setError('Failed to load applications')).finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="container">
          <h1>📋 My Applications</h1>
          <p>Track your placement and internship application statuses</p>
        </div>
      </div>
      <div className="page-content">
        <div className="container">
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? <div className="spinner" /> : apps.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Package / Stipend</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Applied On</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a, i) => (
                    <tr key={a._id} className={`anim-fade-up delay-${Math.min(i + 1, 5)}`}>
                      <td style={{ fontWeight: 600, color: 'var(--forest)' }}>{a.opportunityId?.company || '—'}</td>
                      <td>{a.opportunityId?.role || '—'}</td>
                      <td>{a.opportunityId?.packageOrStipend || '—'}</td>
                      <td>{a.opportunityId?.deadline ? new Date(a.opportunityId.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td><span className={`badge ${STATUS_COLORS[a.status] || 'badge-gray'}`}>{a.status}</span></td>
                      <td style={{ color: 'var(--text-soft)' }}>{new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No applications yet</h3>
              <p>Browse <a href="/opportunities" style={{ color: 'var(--forest)', fontWeight: 600 }}>opportunities</a> and apply to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
