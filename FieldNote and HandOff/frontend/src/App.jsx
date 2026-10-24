import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import VoiceAgentModal from './components/VoiceAgentModal';
import DashboardView from './views/DashboardView';
import EquipmentView from './views/EquipmentView';
import HandoffsView from './views/HandoffsView';
import IncidentsView from './views/IncidentsView';
import MemoryView from './views/MemoryView';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import { getToken, getAllEquipment, getIncidentsByUnit } from './services/api';
import './styles/optima.css';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [authPage, setAuthPage] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [equipmentList, setEquipmentList] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [activeUnit, setActiveUnit] = useState('UNIT-27');

  // Load data when authenticated
  useEffect(() => {
    if (authed) {
      loadAllData();
    }
  }, [authed]);

  const loadAllData = useCallback(async () => {
    try {
      const eqData = await getAllEquipment();
      if (eqData.success && Array.isArray(eqData.equipment)) {
        setEquipmentList(eqData.equipment);
      }
    } catch (err) {
      console.warn('Failed to load equipment:', err.message);
    }

    try {
      const incData = await getIncidentsByUnit('UNIT-27');
      if (incData.success && Array.isArray(incData.incidents)) {
        setIncidents(incData.incidents);
      }
    } catch (err) {
      console.warn('Failed to load incidents:', err.message);
    }
  }, []);

  // Auth redirect via hash
  useEffect(() => {
    const hash = window.location.pathname;
    if (hash.includes('register')) setAuthPage('register');
  }, []);

  const healthScore = equipmentList.length > 0
    ? Math.round(
        equipmentList.filter(e => e.status === 'operational').length / equipmentList.length * 100
      )
    : 94;

  // Handle navigating from quick action pills on dashboard
  const handleSelectAction = (id) => {
    if (id === 'incident') setActiveTab('incidents');
    else if (id === 'handoff') setActiveTab('handoffs');
    else if (id === 'memory') setActiveTab('memory');
  };

  if (!authed) {
    if (authPage === 'register') {
      return (
        <RegisterView
          onRegisterSuccess={() => setAuthed(true)}
          onGoToLogin={() => setAuthPage('login')}
        />
      );
    }
    return (
      <LoginView
        onLoginSuccess={() => setAuthed(true)}
      />
    );
  }

  const renderView = () => {
    switch (activeTab) {
      case 'equipment':
        return <EquipmentView equipmentList={equipmentList} />;
      case 'handoffs':
        return <HandoffsView unitId={activeUnit} />;
      case 'incidents':
        return <IncidentsView incidents={incidents} onRefresh={loadAllData} />;
      case 'memory':
        return <MemoryView />;
      default:
        return (
          <DashboardView
            equipmentList={equipmentList}
            incidents={incidents}
            onOpenVoice={() => setVoiceOpen(true)}
            onSelectAction={handleSelectAction}
            onSelectEquipment={(eq) => { setActiveUnit(eq.equipment_id); setActiveTab('equipment'); }}
            onSelectIncident={(inc) => setActiveTab('incidents')}
            onNavigateTab={setActiveTab}
          />
        );
    }
  };

  return (
    <>
      <div className="app-wrapper">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenVoiceModal={() => setVoiceOpen(true)}
          equipmentCount={equipmentList.length || 3}
          healthScore={healthScore}
        />

        <main>
          {renderView()}
        </main>
      </div>

      {/* AI Voice Agent Modal (always mounted for floating access) */}
      <VoiceAgentModal
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        defaultUnit={activeUnit}
      />
    </>
  );
}
