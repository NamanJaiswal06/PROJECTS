import React, { useState, useEffect } from 'react';
import { Cpu, ShieldAlert, CheckCircle, Clock, Wrench, AlertTriangle } from 'lucide-react';
import { getEquipmentHistory } from '../services/api';

export default function EquipmentView({ equipmentList = [] }) {
  const [selectedEq, setSelectedEq] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (equipmentList.length > 0 && !selectedEq) {
      setSelectedEq(equipmentList[0]);
    }
  }, [equipmentList]);

  useEffect(() => {
    if (selectedEq) {
      fetchHistory(selectedEq.equipment_id);
    }
  }, [selectedEq]);

  const fetchHistory = async (unitId) => {
    setLoadingHistory(true);
    try {
      const data = await getEquipmentHistory(unitId);
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.warn('Failed to load history:', err.message);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
      {/* Left Equipment Roster */}
      <div className="optima-col">
        <div className="optima-card">
          <div className="card-title-main" style={{ marginBottom: '16px' }}>
            Equipment Fleet
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {equipmentList.map((eq) => {
              const isSelected = selectedEq?.equipment_id === eq.equipment_id;
              const isOperational = eq.status === 'operational';

              return (
                <div
                  key={eq.equipment_id}
                  onClick={() => setSelectedEq(eq)}
                  style={{
                    padding: '16px',
                    borderRadius: '18px',
                    background: isSelected ? 'var(--header-gold-soft)' : '#F8FAF9',
                    border: isSelected ? '2px solid var(--header-gold)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: 'var(--clr-text-main)' }}>
                      {eq.equipment_id}
                    </span>
                    <span
                      className={`eq-status-badge ${isOperational ? 'operational' : 'degraded'}`}
                    >
                      {eq.status?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, marginTop: '4px' }}>{eq.name}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--clr-text-muted)', marginTop: '2px' }}>{eq.location}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Detail Pane */}
      {selectedEq && (
        <div className="optima-col">
          <div className="optima-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--header-gold-dark)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {selectedEq.manufacturer} • {selectedEq.model_number}
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, margin: '4px 0' }}>
                  {selectedEq.name} ({selectedEq.equipment_id})
                </h2>
                <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>{selectedEq.notes}</p>
              </div>

              <div className={`eq-status-badge ${selectedEq.status === 'operational' ? 'operational' : 'degraded'}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                STATUS: {selectedEq.status?.toUpperCase()}
              </div>
            </div>

            {/* Specifications Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: '#F8FAF9', padding: '16px', borderRadius: '18px', marginBottom: '24px' }}>
              {selectedEq.specs && Object.entries(selectedEq.specs).map(([key, val]) => (
                <div key={key}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--clr-text-muted)', fontWeight: 700 }}>
                    {key.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Incident History Timeline */}
            <div className="card-title-main" style={{ marginBottom: '16px' }}>
              Historical Incident Logbook ({history.length} records)
            </div>

            {loadingHistory ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--clr-text-muted)' }}>Loading maintenance history...</div>
            ) : history.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--clr-text-muted)' }}>No recorded incidents for this unit yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {history.map((item, idx) => (
                  <div key={idx} style={{ background: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid var(--clr-card-border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--clr-text-main)' }}>
                        {item.symptom}
                      </span>
                      <span className={`activity-val-tag ${item.status === 'resolved' ? 'plus' : 'minus'}`}>
                        {item.status?.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: '8px' }}>
                      <strong>Finding:</strong> {item.finding}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-main)', background: '#F4F7F6', padding: '8px 12px', borderRadius: '10px' }}>
                      <strong>Action Taken:</strong> {item.action}
                    </div>

                    {item.next_action && (
                      <div style={{ fontSize: '0.78rem', color: '#D97706', marginTop: '6px', fontWeight: 600 }}>
                        👉 Next Action: {item.next_action}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
