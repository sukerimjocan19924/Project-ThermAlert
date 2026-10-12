import { useEffect, useRef, useState } from "react";

import "./styles/global.scss";

import Header from "./component/Header";
import DashboardView from "./component/DashboardView";
import SettingsView from "./component/SettingsView";
import AlertModal from "./component/AlertModal";

import useArduinoData from "./hooks/useArduinoData";

const ESP32_IP = "http://10.169.136.86";
const MOBILE_QUERY = "(max-width: 768px)";

// ========================================
// 1. 모바일 화면 확인
// ========================================
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);

    const onChange = (event) => {
      setIsMobile(event.matches);
    };

    mq.addEventListener("change", onChange);

    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, []);

  return isMobile;
}

// ========================================
// 2. 현재 경보 확인
// ========================================
function getCurrentAlert(data) {
  // 연결이 끊겼거나 경보가 없는 경우
  if (!data.connected || !data.outOfRange) {
    return null;
  }

  // [추가] 수동 모드에서 LED와 부저가 모두 꺼져 있으면
  // 경보 배너 및 팝업을 표시하지 않음
  const isManualMode = data.autoMode === false;
  const isLedOff = !data.led;
  const isBuzzerOff = !data.buzzer;

  if (isManualMode && isLedOff && isBuzzerOff) {
    return null;
  }

  const { temp, hum, settings } = data;

  // 온도 상한 초과
  if (typeof temp === "number" && temp > settings.tempMax) {
    return {
      key: `temp-high-${settings.tempMax}`,
      kind: "temp",
      value: temp,
      limit: settings.tempMax,
      unit: "°C",
      direction: "high",
    };
  }

  // 온도 하한 미만
  if (typeof temp === "number" && temp < settings.tempMin) {
    return {
      key: `temp-low-${settings.tempMin}`,
      kind: "temp",
      value: temp,
      limit: settings.tempMin,
      unit: "°C",
      direction: "low",
    };
  }

  // 습도 상한 초과
  if (typeof hum === "number" && hum > settings.humMax) {
    return {
      key: `hum-high-${settings.humMax}`,
      kind: "hum",
      value: hum,
      limit: settings.humMax,
      unit: "%",
      direction: "high",
    };
  }

  // 습도 하한 미만
  if (typeof hum === "number" && hum < settings.humMin) {
    return {
      key: `hum-low-${settings.humMin}`,
      kind: "hum",
      value: hum,
      limit: settings.humMin,
      unit: "%",
      direction: "low",
    };
  }

  return null;
}

// ========================================
// 3. 메인 App
// ========================================
export default function App() {
  const [view, setView] = useState("dashboard");

  const [measurementInterval, setMeasurementInterval] = useState(() => {
    const saved = Number(
      localStorage.getItem("environment-measurement-interval"),
    );

    return [1, 5, 10, 30, 60, 300].includes(saved) ? saved : 30;
  });

  const [alert, setAlert] = useState(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  const lastAlertKey = useRef(null);
  const dismissedAlertKey = useRef(null);

  const isMobile = useIsMobile();

  // ESP32에서 센서 및 장치 상태 수신
  const sensorData = useArduinoData();

  // [추가] 수동 모드 + LED OFF + 부저 OFF 확인
  const isManualMode = sensorData.autoMode === false;
  const areBothDevicesOff = !sensorData.led && !sensorData.buzzer;
  const shouldHideAlert = isManualMode && areBothDevicesOff;

  // 현재 센서 상태와 경보 상태를 바탕으로 경보 생성
  const currentAlert = getCurrentAlert(sensorData);

  // ========================================
  // 4. 경보 상태 관리
  // ========================================
  useEffect(() => {
    // [추가] 수동 모드에서 두 장치가 모두 꺼진 경우
    // 기존 경보와 팝업을 즉시 닫음
    if (shouldHideAlert) {
      lastAlertKey.current = null;
      dismissedAlertKey.current = null;

      setAlert(null);
      setAlertModalOpen(false);

      return;
    }

    // 연결이 끊겼거나 경보 조건이 사라진 경우
    if (!sensorData.connected || !currentAlert) {
      lastAlertKey.current = null;
      dismissedAlertKey.current = null;

      setAlert(null);
      setAlertModalOpen(false);

      return;
    }

    // 새로운 경보가 발생한 경우
    if (lastAlertKey.current !== currentAlert.key) {
      lastAlertKey.current = currentAlert.key;

      setAlert({
        ...currentAlert,
        startedAt: new Date().toISOString(),
      });

      // 사용자가 이미 해제한 동일 경보는 다시 팝업으로 띄우지 않음
      if (dismissedAlertKey.current !== currentAlert.key) {
        setAlertModalOpen(true);
      }
    } else {
      // 같은 경보가 유지되는 동안 최신 센서 값만 업데이트
      setAlert((previous) =>
        previous?.key === currentAlert.key
          ? {
              ...previous,
              value: currentAlert.value,
            }
          : previous,
      );
    }
  }, [
    shouldHideAlert,
    sensorData.connected,
    sensorData.alarmActive,
    sensorData.autoMode,
    sensorData.led,
    sensorData.buzzer,
    sensorData.temp,
    sensorData.hum,
    sensorData.settings.tempMin,
    sensorData.settings.tempMax,
    sensorData.settings.humMin,
    sensorData.settings.humMax,
    currentAlert?.key,
  ]);

  // ========================================
  // 5. 경보 팝업 닫기
  // ========================================
  const closeAlertModal = () => {
    setAlertModalOpen(false);
  };

  // ========================================
  // 6. 경보 해제
  // ========================================
  const dismissAlert = async () => {
    const key = alert?.key;

    dismissedAlertKey.current = key;
    setAlertModalOpen(false);
    setAlert(null);

    try {
      const response = await fetch(`${ESP32_IP}/api/ack`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("경보 해제 요청 실패:", error);

      window.alert(
        "경보 해제 요청에 실패했습니다. ESP32 연결을 확인해 주세요.",
      );
    }
  };

  // ========================================
  // 7. 센서 설정 저장
  // ========================================
  const saveSettings = async (draft) => {
    const params = new URLSearchParams({
      minTemp: String(draft.tempMin),
      maxTemp: String(draft.tempMax),
      minHum: String(draft.humMin),
      maxHum: String(draft.humMax),
      interval: String(draft.interval),
    });

    const response = await fetch(
      `${ESP32_IP}/api/settings?${params.toString()}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`설정 저장 실패: HTTP ${response.status}`);
    }

    const result = await response.json();

    setMeasurementInterval(Number(draft.interval));

    localStorage.setItem(
      "environment-measurement-interval",
      String(draft.interval),
    );

    return result;
  };

  // ========================================
  // 8. 설정 화면 이동
  // ========================================
  const goSettings = () => {
    closeAlertModal();
    setView("settings");
  };

  // ========================================
  // 9. 대시보드 이동
  // ========================================
  const goHistory = () => {
    closeAlertModal();
    setView("dashboard");
  };

  // ========================================
  // 10. 하위 컴포넌트에 전달할 데이터
  // ========================================
  const data = {
    ...sensorData,

    settings: {
      ...sensorData.settings,
      interval: measurementInterval,
    },

    // 두 장치가 모두 꺼져 있으면 하위 화면에도 경보 없음 전달
    alert: shouldHideAlert ? null : alert,
    alertModalOpen: shouldHideAlert ? false : alertModalOpen,
    dismissAlert,
    closeAlertModal,
  };

  // ========================================
  // 11. 화면 렌더링
  // ========================================
  return (
    <div className="app-wrapper">
      <Header
        view={view}
        onNavigate={setView}
        connected={data.connected}
        isMobile={isMobile}
      />

      <main className="page-container">
        {view === "dashboard" ? (
          <DashboardView data={data} isMobile={isMobile} onNavigate={setView} />
        ) : (
          <SettingsView
            settings={data.settings}
            isMobile={isMobile}
            onSave={saveSettings}
          />
        )}
      </main>

      {!shouldHideAlert && alertModalOpen && alert && (
        <AlertModal
          alert={alert}
          isMobile={isMobile}
          onDismiss={dismissAlert}
          onClose={closeAlertModal}
          onOpenSettings={goSettings}
          onOpenHistory={goHistory}
        />
      )}
    </div>
  );
}
