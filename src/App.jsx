import { useEffect, useState } from 'react';
import './styles/global.scss';
import Header from './component/Header';
import DashboardView from './component/DashboardView';
import SettingsView from './component/SettingsView';
import AlertModal from './component/AlertModal';
import useArduinoData from './hooks/useArduinoData';

// global.scss 의 $bp-tablet(768px) 과 동일한 기준
const MOBILE_QUERY = '(max-width: 768px)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

export default function App() {
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'settings'
  const isMobile = useIsMobile();
  const data = useArduinoData();

  const goSettings = () => { data.closeAlertModal(); setView('settings'); };
  // TODO: 알림 이력 화면이 생기면 이곳에서 해당 화면으로 이동
  const goHistory = () => { data.closeAlertModal(); setView('dashboard'); };

  return (
    <div className="app-wrapper">
      <Header view={view} onNavigate={setView} connected={data.connected} isMobile={isMobile} />

      <main className="page-container">
        {view === 'dashboard' ? (
          <DashboardView data={data} isMobile={isMobile} onNavigate={setView} />
        ) : (
          <SettingsView
            settings={data.settings}
            isMobile={isMobile}
            onSave={data.saveSettings}
          />
        )}
      </main>

      {data.alertModalOpen && (
        <AlertModal
          alert={data.alert}
          isMobile={isMobile}
          onDismiss={data.dismissAlert}
          onClose={data.closeAlertModal}
          onOpenSettings={goSettings}
          onOpenHistory={goHistory}
        />
      )}
    </div>
  );
}
