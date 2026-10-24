import React from 'react';
import { Cpu, ArrowRight } from 'lucide-react';

export default function EquipmentStream({ equipmentList = [], onSelectEquipment, onViewAll }) {
  const displayList = equipmentList.length > 0 ? equipmentList : [
    {
      equipment_id: 'UNIT-27',
      name: 'Belt-Drive Air Compressor',
      status: 'degraded',
      location: 'Factory-A, Bay 3',
      manufacturer: 'Atlas Copco',
    },
    {
      equipment_id: 'UNIT-14',
      name: 'Piston Compressor (Backup)',
      status: 'operational',
      location: 'Factory-A, Bay 1',
      manufacturer: 'Ingersoll Rand',
    },
    {
      equipment_id: 'UNIT-31',
      name: 'Rotary Screw Compressor',
      status: 'operational',
      location: 'Factory-B, Bay 2',
      manufacturer: 'Kaeser',
    },
  ];

  return (
    <div className="optima-card">
      <div className="card-header-flex">
        <div className="card-title-main">Top Equipment Status</div>
        <button className="card-action-link" onClick={onViewAll}>
          Fleet View <ArrowRight size={14} />
        </button>
      </div>

      <div className="equipment-stream-list">
        {displayList.map((eq) => {
          const isOperational = eq.status === 'operational';
          const isDegraded = eq.status === 'degraded';

          return (
            <div
              key={eq.equipment_id}
              className="equipment-stream-item"
              onClick={() => onSelectEquipment && onSelectEquipment(eq)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="eq-brand-icon">
                  <Cpu size={20} color="var(--header-gold-dark)" />
                </div>

                <div className="eq-stream-details">
                  <h6>{eq.equipment_id}</h6>
                  <p>{eq.name}</p>
                </div>
              </div>

              <div className="eq-stream-metric">
                <span
                  className={`eq-status-badge ${
                    isOperational ? 'operational' : isDegraded ? 'degraded' : 'critical'
                  }`}
                >
                  {isOperational ? '✓ 98.4%' : isDegraded ? '⚡ 78.2%' : '⚠ 42.0%'}
                </span>
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: '2px' }}>
                  {eq.manufacturer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
