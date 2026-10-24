import React from 'react';
import { Wifi, Cpu, ShieldCheck } from 'lucide-react';
import { getUser } from '../services/api';

export default function TechCard({ activeUnit = 'UNIT-27' }) {
  const user = getUser() || { username: 'Raj Technician', role: 'technician' };

  return (
    <div className="optima-card card-teal-smart">
      <div className="card-nfc-header">
        <div className="card-chip-icon" />
        <Wifi size={20} style={{ opacity: 0.8 }} />
      </div>

      <div>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.85 }}>
          Technician Pass • Active Shift
        </div>
        <div className="card-serial">
          •••• •••• {activeUnit}
        </div>
      </div>

      <div className="card-tech-footer">
        <div>
          <div className="card-tech-name">{user.username}</div>
          <div className="card-tech-unit">{user.role?.toUpperCase() || 'TECHNICIAN'} • BAY 3</div>
        </div>
        <ShieldCheck size={26} style={{ opacity: 0.9 }} />
      </div>
    </div>
  );
}
