import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function FleetHealthRadar() {
  const radarData = [
    { category: 'Mechanical', score: 88, fullMark: 100 },
    { category: 'Thermal', score: 92, fullMark: 100 },
    { category: 'Electrical', score: 96, fullMark: 100 },
    { category: 'Pressure', score: 85, fullMark: 100 },
    { category: 'Vibration', score: 78, fullMark: 100 },
  ];

  return (
    <div className="optima-card" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header-flex">
        <div className="card-title-main">Fleet Health Radar</div>
        <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>Optima Index</span>
      </div>

      <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey="category" stroke="#64748B" fontSize={11} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94A3B8" fontSize={9} />
            <Radar
              name="Health Index"
              dataKey="score"
              stroke="#4DB6AC"
              fill="#4DB6AC"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
