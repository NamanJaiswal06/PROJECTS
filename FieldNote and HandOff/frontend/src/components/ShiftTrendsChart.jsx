import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ShiftTrendsChart({ data }) {
  const chartData = data && data.length > 0 ? data : [
    { time: '08:00', logs: 12, health: 96, pressure: 148 },
    { time: '10:00', logs: 18, health: 94, pressure: 145 },
    { time: '12:00', logs: 24, health: 91, pressure: 142 },
    { time: '14:00', logs: 20, health: 93, pressure: 146 },
    { time: '16:00', logs: 28, health: 95, pressure: 149 },
    { time: '18:00', logs: 32, health: 94, pressure: 150 },
  ];

  return (
    <div className="optima-card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header-flex">
        <div>
          <div className="card-title-main">Shift Maintenance Activity</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)', marginTop: '2px' }}>
            System logs & pressure trendlines over 24h
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--header-gold-dark)', background: 'var(--header-gold-soft)', padding: '4px 12px', borderRadius: '12px' }}>
          Real-time
        </div>
      </div>

      <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F4A522" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#F4A522" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                fontSize: '12px',
                fontFamily: 'Plus Jakarta Sans',
              }}
            />
            <Area
              type="monotone"
              dataKey="logs"
              stroke="#F4A522"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#goldGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
