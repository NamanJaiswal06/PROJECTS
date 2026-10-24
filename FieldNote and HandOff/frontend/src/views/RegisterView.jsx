import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { registerUser, setSession } from '../services/api';

export default function RegisterView({ onRegisterSuccess, onGoToLogin }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'technician',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pwStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const strengthLabels = ['', 'Weak', 'Weak', 'Medium', 'Strong'];
  const strengthColors = ['', '#EF4444', '#EF4444', '#F59E0B', '#10B981'];
  const strength = pwStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.email || !form.password) { setError('All fields are required.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const data = await registerUser({ username: form.username, email: form.email, password: form.password, role: form.role });
      setSession(data.token, data.user);
      onRegisterSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div style={{
        position: 'fixed',
        top: '-20%',
        left: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(77,182,172,0.18) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      <div className="auth-box" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔐</div>
          <div className="auth-logo">Join FieldNote</div>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
            Create your technician account to start logging field notes
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FCE8E6',
            color: '#C5221F',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '0.88rem',
            fontWeight: 600,
            marginBottom: '16px',
          }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Username</label>
              <input
                id="reg-username"
                type="text"
                className="input-field"
                placeholder="raj_tech"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Role</label>
              <select
                className="input-field"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="technician">Field Technician</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
          </div>

          <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Email Address</label>
          <input
            id="reg-email"
            type="email"
            className="input-field"
            placeholder="raj@factory-a.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg-password"
              type={showPw ? 'text' : 'password'}
              className="input-field"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ paddingRight: '48px' }}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '14px', top: '14px', color: 'var(--clr-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Password strength bars */}
          {form.password.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {[1, 2, 3, 4].map((bar) => (
                  <div key={bar} style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '4px',
                    background: bar <= strength ? strengthColors[strength] : '#E2E8F0',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: strengthColors[strength] }}>
                Password strength: {strengthLabels[strength]}
              </div>
            </div>
          )}

          <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Confirm Password</label>
          <input
            id="reg-confirm"
            type="password"
            className="input-field"
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />

          <button id="register-submit" type="submit" className="btn-primary-gold" disabled={loading}>
            {loading ? 'Creating Account...' : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Create FieldNote Account <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--clr-text-muted)', marginTop: '20px' }}>
          Already have an account?{' '}
          <button onClick={onGoToLogin} style={{ color: 'var(--header-gold-dark)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
            Sign in →
          </button>
        </p>
      </div>
    </div>
  );
}
