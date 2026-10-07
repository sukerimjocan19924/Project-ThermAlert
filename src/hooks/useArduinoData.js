// ============================================================
// useArduinoData.js — Arduino 센서 데이터 훅 (임시 데이터)
// 실제 연동 시 tick() 안의 랜덤 값 생성 부분을
// WebSocket / Serial / fetch 응답으로 교체하세요.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { clamp, getRangeStatus } from "../utils/formatters";

export const DEFAULT_SETTINGS = {
  tempMax: 30,
  tempMin: 10,
  humMax: 70,
  humMin: 30,
  interval: 5, // 초
};

// 최근 24시간(0~24시) 임시 이력 데이터
const MOCK_TEMP = [
  12, 11.5, 11, 10.5, 10, 9.6, 9.3, 9.5, 10.2, 11.5, 13, 15, 17, 19, 22, 27, 33,
  38.2, 36, 32, 28, 25, 23, 22.1, 21.5,
];
const MOCK_HUM = [
  62, 63, 64, 65, 66, 67, 68, 68, 67, 66, 65, 64, 63, 62, 61, 60, 59, 58, 60,
  63, 66, 68, 70, 72, 73,
];
const MOCK_HISTORY = MOCK_TEMP.map((temp, hour) => ({
  hour,
  temp,
  hum: MOCK_HUM[hour],
}));

const NO_ALERT = { startedAt: null, acknowledged: false, modalOpen: false };

export default function useArduinoData() {
  const [connected] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [temp, setTemp] = useState(32.5);
  const [hum, setHum] = useState(75);
  const [history] = useState(MOCK_HISTORY);

  const [mode, setMode] = useState("auto"); // 'auto' | 'manual'
  const [manualLed, setManualLed] = useState(false);
  const [manualBuzzer, setManualBuzzer] = useState(false);
  const [alertMeta, setAlertMeta] = useState(NO_ALERT);

  // ── 센서 값 갱신 (측정 주기마다) ──────────────────────────
  useEffect(() => {
    const tick = () => {
      setTemp((t) => {
        const next = t + (Math.random() - 0.5) * 1.2 + (28 - t) * 0.03;
        return Math.round(clamp(next, 5, 45) * 10) / 10;
      });
      setHum((h) =>
        Math.round(
          clamp(h + (Math.random() - 0.5) * 3 + (55 - h) * 0.02, 20, 95),
        ),
      );
    };
    const id = setInterval(tick, settings.interval * 1000);
    return () => clearInterval(id);
  }, [settings.interval]);

  // ── 범위 판정 ─────────────────────────────────────────────
  const tempStatus = getRangeStatus(temp, settings.tempMin, settings.tempMax);
  const humStatus = getRangeStatus(hum, settings.humMin, settings.humMax);
  const outOfRange = tempStatus !== "normal" || humStatus !== "normal";

  // 경보 시작 / 종료 감지
  useEffect(() => {
    if (outOfRange) {
      setAlertMeta((m) =>
        m.startedAt
          ? m
          : { startedAt: new Date(), acknowledged: false, modalOpen: true },
      );
    } else {
      setAlertMeta((m) => (m.startedAt ? NO_ALERT : m));
    }
  }, [outOfRange]);

  // 현재 경보 정보 (온도 우선)
  const alert = useMemo(() => {
    if (!outOfRange || !alertMeta.startedAt || alertMeta.acknowledged)
      return null;
    const isTemp = tempStatus !== "normal";
    const status = isTemp ? tempStatus : humStatus;
    return {
      kind: isTemp ? "temp" : "hum",
      direction: status, // 'high' | 'low'
      value: isTemp ? temp : hum,
      limit: isTemp
        ? status === "high"
          ? settings.tempMax
          : settings.tempMin
        : status === "high"
          ? settings.humMax
          : settings.humMin,
      unit: isTemp ? "°C" : "%",
      startedAt: alertMeta.startedAt,
    };
  }, [outOfRange, alertMeta, tempStatus, humStatus, temp, hum, settings]);

  // ── 장치 상태 ─────────────────────────────────────────────
  const led = mode === "auto" ? !!alert : manualLed;
  const buzzer = mode === "auto" ? !!alert : manualBuzzer;

  // ── 오늘의 통계 ───────────────────────────────────────────
  const stats = useMemo(() => {
    const temps = [...history.map((p) => p.temp), temp];
    const maxPoint = history.reduce(
      (a, b) => (b.temp > a.temp ? b : a),
      history[0],
    );
    const minPoint = history.reduce(
      (a, b) => (b.temp < a.temp ? b : a),
      history[0],
    );
    const max = Math.max(...temps);
    const min = Math.min(...temps);
    return {
      max,
      min,
      avg: temps.reduce((s, v) => s + v, 0) / temps.length,
      maxHour: max === temp ? null : maxPoint.hour,
      minHour: min === temp ? null : minPoint.hour,
    };
  }, [history, temp]);

  // ── 액션 ──────────────────────────────────────────────────
  const saveSettings = useCallback((next) => setSettings({ ...next }), []);
  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const dismissAlert = useCallback(
    () => setAlertMeta((m) => ({ ...m, acknowledged: true, modalOpen: false })),
    [],
  );
  const closeAlertModal = useCallback(
    () => setAlertMeta((m) => ({ ...m, modalOpen: false })),
    [],
  );

  const toggleLed = useCallback(
    () => mode === "manual" && setManualLed((v) => !v),
    [mode],
  );
  const toggleBuzzer = useCallback(
    () => mode === "manual" && setManualBuzzer((v) => !v),
    [mode],
  );

  return {
    connected,
    temp,
    hum,
    tempStatus,
    humStatus,
    settings,
    history,
    stats,
    led,
    buzzer,
    mode,
    setMode,
    alert,
    alertModalOpen: !!alert && alertMeta.modalOpen,
    saveSettings,
    resetSettings,
    dismissAlert,
    closeAlertModal,
    toggleLed,
    toggleBuzzer,
  };
}
