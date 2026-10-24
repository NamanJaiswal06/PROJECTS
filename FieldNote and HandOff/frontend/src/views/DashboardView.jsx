import React from 'react';
import TechCard from '../components/TechCard';
import VoiceQuickCard from '../components/VoiceQuickCard';
import QuickActionsRow from '../components/QuickActionsRow';
import ShiftTrendsChart from '../components/ShiftTrendsChart';
import FleetHealthRadar from '../components/FleetHealthRadar';
import ActivityStream from '../components/ActivityStream';
import EquipmentStream from '../components/EquipmentStream';

export default function DashboardView({
  equipmentList,
  incidents,
  onOpenVoice,
  onSelectAction,
  onSelectEquipment,
  onSelectIncident,
  onNavigateTab,
}) {
  const activeUnit = equipmentList[0]?.equipment_id || 'UNIT-27';

  return (
    <div className="optima-grid-dashboard">
      {/* COLUMN 1: LEFT CARDS (Tech Smart Badge + Quick Voice Recorder + Quick Actions) */}
      <div className="optima-col">
        <TechCard activeUnit={activeUnit} />
        <VoiceQuickCard onOpenVoice={onOpenVoice} />
        <QuickActionsRow onSelectAction={onSelectAction} />
      </div>

      {/* COLUMN 2: MIDDLE CARDS (Shift Maintenance Activity Chart + Recent Log Feed) */}
      <div className="optima-col">
        <ShiftTrendsChart />
        <ActivityStream
          incidents={incidents}
          onSelectIncident={onSelectIncident}
          onViewAll={() => onNavigateTab('incidents')}
        />
      </div>

      {/* COLUMN 3: RIGHT CARDS (Fleet Health Radar + Top Equipment Stream) */}
      <div className="optima-col">
        <FleetHealthRadar />
        <EquipmentStream
          equipmentList={equipmentList}
          onSelectEquipment={onSelectEquipment}
          onViewAll={() => onNavigateTab('equipment')}
        />
      </div>
    </div>
  );
}
