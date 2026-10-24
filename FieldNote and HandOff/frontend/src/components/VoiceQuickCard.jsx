import React from 'react';
import { Mic, ArrowRight } from 'lucide-react';

export default function VoiceQuickCard({ onOpenVoice }) {
  return (
    <div className="optima-card card-coral-action" onClick={onOpenVoice}>
      <div className="coral-mic-frame">
        <Mic size={24} color="#FFF" />
      </div>
      <div className="coral-action-text" style={{ flex: 1 }}>
        <h4>Record Audio Field Note & Ask AI</h4>
        <p>TAP TO START VOICE AGENT <ArrowRight size={12} style={{ verticalAlign: 'middle', marginLeft: '4px' }} /></p>
      </div>
    </div>
  );
}
