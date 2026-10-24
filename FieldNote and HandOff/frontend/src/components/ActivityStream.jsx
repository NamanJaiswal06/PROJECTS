import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, ArrowRight } from 'lucide-react';

export default function ActivityStream({ incidents = [], onSelectIncident, onViewAll }) {
  const displayItems = incidents.length > 0 ? incidents.slice(0, 5) : [
    {
      _id: '1',
      symptom: 'Compressor vibration on startup',
      finding: 'Loose mounting bolts on motor bracket',
      action: 'Torqued mounting bolts to 45 Nm spec',
      status: 'resolved',
      priority: 'high',
      unit_id: 'UNIT-27',
      createdAt: '2026-08-09T10:15:00Z',
    },
    {
      _id: '2',
      symptom: 'Grinding noise near belt housing',
      finding: 'Idler pulley bearing worn',
      action: 'Ordered replacement bearing, reduced load',
      status: 'unresolved',
      priority: 'high',
      unit_id: 'UNIT-27',
      createdAt: '2026-08-08T14:30:00Z',
    },
    {
      _id: '3',
      symptom: 'Oil level low, minor seepage at rear seal',
      finding: 'Rear crankshaft seal weeping',
      action: 'Topped up oil, flagged seal for next PM window',
      status: 'monitoring',
      priority: 'medium',
      unit_id: 'UNIT-27',
      createdAt: '2026-08-07T09:00:00Z',
    },
  ];

  return (
    <div className="optima-card">
      <div className="card-header-flex">
        <div className="card-title-main">Field Log Activity Feed</div>
        <button className="card-action-link" onClick={onViewAll}>
          View All <ArrowRight size={14} />
        </button>
      </div>

      <div className="activity-list-container">
        {displayItems.map((item) => {
          const isResolved = item.status === 'resolved';
          const isCritical = item.status === 'unresolved' || item.priority === 'high';

          return (
            <div
              key={item._id || item.id}
              className="activity-item-card"
              onClick={() => onSelectIncident && onSelectIncident(item)}
              style={{ cursor: 'pointer' }}
            >
              <div className="activity-item-left">
                <div
                  className={`activity-icon-badge ${
                    isResolved ? 'resolved' : isCritical ? 'critical' : 'monitoring'
                  }`}
                >
                  {isResolved ? (
                    <CheckCircle2 size={20} />
                  ) : isCritical ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <Clock size={20} />
                  )}
                </div>

                <div className="activity-info">
                  <h5>{item.symptom || 'Observation Recorded'}</h5>
                  <p>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{item.unit_id}</span> • {item.action || item.finding || 'Field note logged'}
                  </p>
                </div>
              </div>

              <div className="activity-item-right">
                <div className={`activity-val-tag ${isResolved ? 'plus' : 'minus'}`}>
                  {isResolved ? '+ RESOLVED' : '⚡ ATTENTION'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: '2px' }}>
                  {new Date(item.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
