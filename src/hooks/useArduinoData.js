import { useCallback, useEffect, useRef, useState } from "react";

export const ESP32_IP = "http://10.169.136.86";

export const DEFAULT_SETTINGS = {
  minTemp: 20,
  maxTemp: 25,
  minHum: 60,
  maxHum: 70,
};

const INITIAL_DATA = {
  connected: false,
  temp: null,
  hum: null,
  settings: {
    tempMin: 20,
    tempMax: 25,
    humMin: 60,
    humMax: 70,
    interval: 5,
  },
  autoMode: true,
  outOfRange: false,
  alarmActive: false,
  led: false,
  buzzer: false,
  manualLedOn: false,
  manualBuzzerOn: false,
};

export default function useArduinoData() {
  const [data, setData] = useState(INITIAL_DATA);
  const requestRef = useRef(false);
  const mountedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (requestRef.current) return;

    requestRef.current = true;

    try {
      const response = await fetch(`${ESP32_IP}/api/status`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!mountedRef.current) return;

      setData({
        connected: true,
        temp:
          typeof result.temperature === "number" ? result.temperature : null,
        hum: typeof result.humidity === "number" ? result.humidity : null,
        settings: {
          tempMin: Number(result.minTemp ?? 20),
          tempMax: Number(result.maxTemp ?? 25),
          humMin: Number(result.minHum ?? 60),
          humMax: Number(result.maxHum ?? 70),
          interval: Number(result.interval ?? 5),
        },
        autoMode: result.autoMode !== false,
        outOfRange: Boolean(result.outOfRange),
        alarmActive: Boolean(result.alarmActive),
        led: Boolean(result.ledOn),
        buzzer: Boolean(result.buzzerOn),
        manualLedOn: Boolean(result.manualLedOn),
        manualBuzzerOn: Boolean(result.manualBuzzerOn),
      });
    } catch (error) {
      console.error("ESP32 연결 실패:", error);

      if (mountedRef.current) {
        setData((previous) => ({
          ...previous,
          connected: false,
        }));
      }
    } finally {
      requestRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    refresh();

    const timer = setInterval(refresh, 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [refresh]);

  return {
    ...data,
    refresh,
  };
}
