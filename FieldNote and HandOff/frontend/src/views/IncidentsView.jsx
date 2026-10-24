import React, { useState } from 'react';
import { AlertCircle, Plus, Filter, CheckCircle2, Clock, X } from 'lucide-react';
import { createIncident } from '../services/api';

export default function IncidentsView({ incidents = [], onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    unit_id: 'UNIT-27',
    symptom: '',
    finding: '',
    action: '',
    status: 'unresolved',
    priority: 'high',
    next_action: '',
  });
  const [loading, setLoading] = useState(false);

  const filteredIncidents = incidents.filter((item) => {
    if (filter === 'resolved') return item.status === 'resolved';
    if (filter === 'unresolved') return item.status === 'unresolved';
    if (filter === 'monitoring') return item.status === 'monitoring';
    return true;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.symptom || !form.finding) return;
    setLoading(true);
    try {
      const res = await createIncident(form);
      if (res.success) {
        setShowModal(false);
        setForm({
          unit_id: 'UNIT-27',
          symptom: '',
          finding: '',
          action: '',
          status: 'unresolved',
          priority: 'high',
          next_action: '',
        });
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert(`Error submitting incident: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="optima-card">
      <div className="card-header-flex">
        <div>
          <div className="card-title-main" style={{ fontSize: '1.4rem' }}>
            Field Maintenance Logbook
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginTop: '2px' }}>
            {incidents.length} observations & incident logs recorded
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Filters */}
          <div className="optima-nav-tabs" style={{ background: '#F8FAF9', padding: '4px' }}>
            {['all', 'unresolved', 'resolved', 'monitoring'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`optima-tab-btn ${filter === f ? 'active' : ''}`}
                style={{ fontSize: '0.78rem', padding: '6px 14px' }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          {/* New Incident button */}
          <button
            className="btn-primary-gold"
            style={{ width: 'auto', padding: '8px 18px', fontSize: '0.85rem' }}
            onClick={() => setShowModal(true)}
          >
            <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Log Incident
          </button>
        </div>
      </div>

      {/* Incidents Table / Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
        {filteredIncidents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--clr-text-muted)' }}>
            No incidents match the selected filter.
          </div>
        ) : (
          filteredIncidents.map((item) => {
            const isResolved = item.status === 'resolved';

            return (
              <div
                key={item._id || item.id}
                style={{
                  background: '#F8FAF9',
                  padding: '20px',
                  borderRadius: '20px',
                  border: '1px solid var(--clr-card-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--header-gold-dark)', background: 'var(--header-gold-soft)', padding: '4px 10px', borderRadius: '10px' }}>
                      {item.unit_id}
                    </span>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--clr-text-main)' }}>
                      {item.symptom}
                    </h4>
                  </div>

                  <span className={`activity-val-tag ${isResolved ? 'plus' : 'minus'}`}>
                    {item.status?.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '12px 0' }}>
                  <div style={{ fontSize: '0.88rem', color: 'var(--clr-text-muted)' }}>
                    <strong style={{ color: 'var(--clr-text-main)' }}>Finding:</strong> {item.finding}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--clr-text-muted)' }}>
                    <strong style={{ color: 'var(--clr-text-main)' }}>Action Taken:</strong> {item.action || 'Pending action'}
                  </div>
                </div>

                {item.next_action && (
                  <div style={{ fontSize: '0.82rem', color: '#D97706', background: '#FEF7E0', padding: '8px 14px', borderRadius: '12px', fontWeight: 600 }}>
                    👉 Next Action: {item.next_action}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal overlay to create new incident */}
      {showModal && (
        <div className="voice-agent-overlay" onClick={() => setShowModal(false)}>
          <div className="voice-agent-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="voice-agent-header">
              <h3>Log New Field Incident</h3>
              <button onClick={() => setShowModal(false)} style={{ color: '#FFF' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="voice-agent-body">
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Equipment Unit</label>
                <select
                  className="input-field"
                  value={form.unit_id}
                  onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                >
                  <option value="UNIT-27">UNIT-27 (Belt-Drive Air Compressor)</option>
                  <option value="UNIT-14">UNIT-14 (Piston Backup Compressor)</option>
                  <option value="UNIT-31">UNIT-31 (Rotary Screw Compressor)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Observed Symptom</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Belt squealing at high load"
                  value={form.symptom}
                  onChange={(e) => setForm({ ...form, symptom: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Root Finding</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Belt tension below spec, surface cracking"
                  value={form.finding}
                  onChange={(e) => setForm({ ...form, finding: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Action Taken</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Replaced B52 belt, re-tensioned"
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Status</label>
                  <select
                    className="input-field"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="unresolved">Unresolved</option>
                    <option value="resolved">Resolved</option>
                    <option value="monitoring">Monitoring</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Priority</label>
                  <select
                    className="input-field"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary-gold" disabled={loading}>
                {loading ? 'Recording Log...' : 'Save Incident Log'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
