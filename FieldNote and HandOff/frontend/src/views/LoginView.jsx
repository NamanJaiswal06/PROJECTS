import React, { useState } from 'react';
import { Mic, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { loginUser, setSession } from '../services/api';

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in both fields.'); return; }
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      setSession(data.token, data.user);
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('raj@factory-a.com');
    setPassword('FieldNote2026!');
    setError('');
  };

  return (
    <div className="auth-container">
      {/* Background animated orbs */}
      <div style={{
        position: 'fixed',
        top: '-20%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(244,165,34,0.18) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-10%',
        left: '-5%',
        width: '380px',
        height: '380px',
        background: 'radial-gradient(circle, rgba(77,182,172,0.14) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      <div className="auth-box">
        {/* Logo */}
        <div className="auth-header">
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎙</div>
          <div className="auth-logo">• FIELDNOTE •</div>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
            Voice-first maintenance intelligence platform
          </p>
        </div>

        {/* Error banner */}
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
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--clr-text-main)' }}>
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            className="input-field"
            placeholder="raj@factory-a.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--clr-text-main)' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              type={showPw ? 'text' : 'password'}
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ paddingRight: '48px' }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: 'absolute',
                right: '14px',
                top: '14px',
                color: 'var(--clr-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button id="login-submit" type="submit" className="btn-primary-gold" disabled={loading} style={{ marginBottom: '12px' }}>
            {loading ? 'Signing in...' : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Sign In to FieldNote <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)', fontWeight: 600 }}>HACKATHON DEMO</span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        {/* Demo Quick Fill */}
        <button className="btn-demo-quick" onClick={fillDemo} type="button">
          <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Use Demo Credentials (raj@factory-a.com)
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--clr-text-muted)', marginTop: '20px' }}>
          No account?{' '}
          <a href="/register" style={{ color: 'var(--header-gold-dark)', fontWeight: 700 }}>Create one →</a>
        </p>
      </div>
    </div>
  );
}
