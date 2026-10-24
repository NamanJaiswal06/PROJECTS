import React from 'react';
import { AlertCircle, FileText, Database, Plus } from 'lucide-react';

export default function QuickActionsRow({ onSelectAction }) {
  const actions = [
    { id: 'incident', title: 'New Log', icon: AlertCircle, color: '#F59E0B' },
    { id: 'handoff', title: 'Handoff', icon: FileText, color: '#3B82F6' },
    { id: 'memory', title: 'RAG Search', icon: Database, color: '#10B981' },
  ];

  return (
    <div className="optima-mini-actions-row">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <button
            key={act.id}
            className="mini-action-pill"
            onClick={() => onSelectAction(act.id)}
          >
            <div className="pill-icon" style={{ color: act.color, background: `${act.color}15` }}>
              <Icon size={18} />
            </div>
            <span className="pill-title">{act.title}</span>
            <div className="pill-plus-btn">
              <Plus size={12} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
