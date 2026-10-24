import React from 'react';
import { LogOut, Mic, ShieldAlert, Cpu, Activity } from 'lucide-react';
import { clearSession, getUser } from '../services/api';

export default function Header({ activeTab, setActiveTab, onOpenVoiceModal, equipmentCount = 3, healthScore = 94 }) {
  const user = getUser() || { username: 'Raj Technician', role: 'technician' };

  const handleLogout = () => {
    clearSession();
    window.location.reload();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'equipment', label: 'Equipment Fleet' },
    { id: 'handoffs', label: 'Shift Handoffs' },
    { id: 'incidents', label: 'Incidents Log' },
    { id: 'memory', label: 'Memory RAG' },
  ];

  return (
    <header className="optima-header">
      {/* Top Navbar Row */}
      <div className="optima-header-top">
        <div className="optima-logo-brand">
          <div className="optima-logo-text">
            <span className="optima-logo-dot"></span>
            • FIELDNOTE •
          </div>
        </div>

        {/* Navigation Tabs (Optima Header Navigation) */}
        <nav className="optima-nav-tabs">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`optima-tab-btn ${activeTab === item.id ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Quick Voice & Logout Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onOpenVoiceModal}
            className="optima-tab-btn"
            style={{ background: 'rgba(255,255,255,0.25)', color: '#FFF' }}
          >
            <Mic size={16} /> AI Assistant
          </button>
          <button
            onClick={handleLogout}
            className="optima-tab-btn"
            style={{ background: 'rgba(0,0,0,0.15)', color: '#FFF' }}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Header Body: User Welcome + Center Cutout Gauge + Shift Metrics */}
      <div className="optima-header-body">
        {/* Left: User Avatar & Greeting */}
        <div className="optima-user-welcome">
          <div className="user-avatar-frame">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="user-greeting-text">Good Shift,</div>
            <div className="user-name-title">{user.username}</div>
          </div>
        </div>

        {/* Center: Signature OPTIMA Semi-Circle Dial Gauge Cutout */}
        <div className="optima-center-gauge-wrapper">
          <div className="gauge-cutout-bg">
            <div className="gauge-dial-container">
              <svg className="gauge-svg" viewBox="0 0 100 50">
                {/* Arc Background */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Active Arc Fill */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="8"
                  strokeDasharray="125.6"
                  strokeDashoffset={125.6 - (125.6 * healthScore) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
                {/* Indicator Pin */}
                <circle cx="78" cy="22" r="3.5" fill="#FFFFFF" />
              </svg>

              <div className="gauge-text-overlay">
                <div className="gauge-title">{healthScore}%</div>
                <div className="gauge-subtitle">Shift Readiness</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Shift Fleet Metrics */}
        <div className="optima-header-metrics">
          <div className="metrics-icon-btn">
            <Cpu size={22} />
          </div>
          <div>
            <div className="metrics-label">Fleet Monitored</div>
            <div className="metrics-val">{equipmentCount} Units</div>
          </div>
        </div>
      </div>
    </header>
  );
}
