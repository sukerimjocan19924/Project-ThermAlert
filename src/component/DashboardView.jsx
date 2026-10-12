import { useEffect, useRef, useState } from "react";

import {
  Activity,
  ArrowDown,
  ArrowUp,
  Bell,
  BellOff,
  Calendar,
  Check,
  Clock,
  Cpu,
  Droplets,
  Lightbulb,
  SlidersHorizontal,
  Thermometer,
  Volume2,
} from "lucide-react";

import {
  buildAlertText,
  formatHumidity,
  formatTemp,
  formatTime,
  pad,
  smoothPath,
  STATUS_LABEL,
  toPercent,
} from "../utils/formatters";

import styles from "./DashboardView.module.scss";

const ESP32_IP = "http://10.169.136.86";

// ========================================
// 1. 온습도 변화 그래프
// ========================================
function TrendChart({ history, tempMax, isMobile }) {
  const W = isMobile ? 340 : 700;
  const H = isMobile ? 190 : 260;
  const m = { l: 34, r: 34, t: 28, b: 24 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;

  const safeHistory = Array.isArray(history) ? history : [];

  if (safeHistory.length === 0) {
    return (
      <div
        className={styles.chart}
        style={{
          minHeight: H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
          fontSize: 14,
        }}
      >
        실제 측정 데이터 수집 중입니다.
      </div>
    );
  }

  const x = (hour) => m.l + (hour / 24) * iw;
  const yTemp = (v) => m.t + ih - (v / 40) * ih;
  const yHum = (v) => m.t + ih - (v / 100) * ih;

  const closeArea = (line) =>
    `${line} L ${x(24)} ${m.t + ih} L ${x(0)} ${m.t + ih} Z`;

  const tempLine = smoothPath(
    safeHistory.map((p) => [x(p.hour), yTemp(p.temp)]),
  );

  const humLine = smoothPath(safeHistory.map((p) => [x(p.hour), yHum(p.hum)]));

  const peak = safeHistory.reduce(
    (a, b) => (b.temp > a.temp ? b : a),
    safeHistory[0],
  );

  const px = x(peak.hour);
  const py = yTemp(peak.temp);
  const labelW = 74;
  const labelX = Math.min(Math.max(px - labelW / 2, m.l), W - m.r - labelW);
  const labelY = Math.max(py - 36, 2);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.chart}
      role="img"
      aria-label="최근 온도와 습도 변화 그래프"
    >
      <defs>
        <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="humFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 10, 20, 30, 40].map((t) => (
        <g key={t}>
          <line
            x1={m.l}
            x2={W - m.r}
            y1={yTemp(t)}
            y2={yTemp(t)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          <text
            x={m.l - 6}
            y={yTemp(t) + 3}
            textAnchor="end"
            fontSize="10"
            fill="#9ca3af"
          >
            {t}°C
          </text>

          <text x={W - m.r + 6} y={yTemp(t) + 3} fontSize="10" fill="#9ca3af">
            {t * 2.5}%
          </text>
        </g>
      ))}

      {[0, 6, 12, 18, 24].map((h) => (
        <text
          key={h}
          x={x(h)}
          y={H - 6}
          textAnchor="middle"
          fontSize="10"
          fill="#9ca3af"
        >
          {h}시
        </text>
      ))}

      <line
        x1={m.l}
        x2={W - m.r}
        y1={yTemp(tempMax)}
        y2={yTemp(tempMax)}
        stroke="#fca5a5"
        strokeWidth="1.2"
        strokeDasharray="5 4"
      />

      <path d={closeArea(humLine)} fill="url(#humFill)" />
      <path d={closeArea(tempLine)} fill="url(#tempFill)" />

      <path
        d={humLine}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d={tempLine}
        fill="none"
        stroke="#ef4444"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      <line
        x1={px}
        x2={px}
        y1={py}
        y2={m.t + ih}
        stroke="#fca5a5"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      <circle
        cx={px}
        cy={py}
        r="4.5"
        fill="#fff"
        stroke="#ef4444"
        strokeWidth="2"
      />

      <rect
        x={labelX}
        y={labelY}
        width={labelW}
        height="28"
        rx="6"
        fill="#ef4444"
      />

      <text
        x={labelX + labelW / 2}
        y={labelY + 12}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#fff"
      >
        {formatTemp(peak.temp)}°C 최고!
      </text>

      <text
        x={labelX + labelW / 2}
        y={labelY + 23}
        textAnchor="middle"
        fontSize="8.5"
        fill="#fecaca"
      >
        {peak.timestamp
          ? new Date(peak.timestamp).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : `${pad(Math.floor(peak.hour))}:00`}{" "}
        기록
      </text>
    </svg>
  );
}

// ========================================
// 2. 센서 카드
// ========================================
const tone = (status) => (status === "normal" ? "success" : "danger");

function SensorCard({ kind, value, status, limits }) {
  const isTemp = kind === "temp";
  const statusTone = tone(status);
  const pct = value == null ? 0 : toPercent(value, 0, isTemp ? 50 : 100);
  const unit = isTemp ? "°C" : "%";

  return (
    <div
      className={`kpi-card ${
        status !== "normal" && isTemp ? styles.cardDanger : ""
      }`}
    >
      <div className="kpi-card__header">
        <div
          className={`kpi-card__icon kpi-card__icon--${
            isTemp ? "red" : "green"
          }`}
        >
          {isTemp ? (
            <Thermometer size={20} color="#ef4444" />
          ) : (
            <Droplets size={20} color="#22c55e" />
          )}
        </div>

        <span className={`kpi-card__badge kpi-card__badge--${statusTone}`}>
          {status === "unknown"
            ? "측정 대기"
            : (STATUS_LABEL[status] ??
              (status === "danger" ? "범위 벗어남" : "정상"))}
        </span>
      </div>

      <span className="kpi-card__label">
        {isTemp ? "현재 온도" : "현재 습도"}
      </span>

      <div className="kpi-card__value">
        <span
          className={`kpi-card__value--number kpi-card__value--number-lg ${statusTone}`}
        >
          {value == null
            ? "--"
            : isTemp
              ? formatTemp(value)
              : formatHumidity(value)}
        </span>

        <span className={`kpi-card__value--unit ${statusTone} ${styles.unit}`}>
          {isTemp ? "℃" : "%"}
        </span>
      </div>

      <div>
        <div className="progress-bar">
          <div
            className={`progress-bar__fill progress-bar__fill--${
              isTemp ? "temp" : "hum"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="progress-bar__limits">
          <span>
            최저 {limits.min}
            {unit}
          </span>
          <span>
            최고 {limits.max}
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 3. 장치 카드
// 수동 모드에서는 켜진 장치만 개별적으로 끄기 가능
// ========================================
function DeviceCard({ kind, on, mode, onToggle }) {
  const isLed = kind === "led";
  const manual = mode === "manual";
  const canTurnOff = manual && on;

  const handleKeyDown = (e) => {
    if (!canTurnOff) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  let description = "정상 · 대기 중";

  if (manual) {
    description = on ? "클릭하여 끄기" : "꺼져 있음";
  } else if (on) {
    description = isLed ? "점멸 중 · 경보 감지" : "경보 작동 중";
  }

  return (
    <div
      className={`kpi-card ${canTurnOff ? styles.clickable : ""}`}
      onClick={canTurnOff ? onToggle : undefined}
      onKeyDown={handleKeyDown}
      role={canTurnOff ? "button" : undefined}
      tabIndex={canTurnOff ? 0 : undefined}
      aria-label={canTurnOff ? `${isLed ? "LED" : "부저"} 끄기` : undefined}
    >
      <div className="kpi-card__header">
        <div
          className={`kpi-card__icon kpi-card__icon--${
            isLed ? "red" : "purple"
          }`}
        >
          {isLed ? (
            <Lightbulb size={20} color="#ef4444" />
          ) : (
            <Volume2 size={20} color="#7c3aed" />
          )}
        </div>

        <span
          className={`kpi-card__badge kpi-card__badge--${
            isLed ? "danger" : "warning"
          } ${on ? "" : styles.badgeIdle}`}
        >
          {on ? (isLed ? "경보" : "경보 중") : "대기"}
        </span>
      </div>

      <span className="kpi-card__label">
        {isLed ? "LED 상태" : "부저 상태"}
      </span>

      <div className={`kpi-card__value ${styles.deviceValue}`}>
        <span
          className={`kpi-card__value--number kpi-card__value--number-lg ${
            on
              ? isLed
                ? styles.valueRed
                : styles.valuePurple
              : styles.valueOff
          }`}
        >
          {on ? "ON" : "OFF"}
        </span>

        <span
          className={`status-dot ${
            on
              ? `status-dot--${isLed ? "red" : "purple"} status-dot--pulse`
              : "status-dot--gray"
          }`}
        />
      </div>

      <span className={styles.desc}>{description}</span>
    </div>
  );
}

// ========================================
// 4. 운영 모드 카드
// ========================================
function ModeCard({ mode, onChange }) {
  const options = [
    { id: "auto", label: "자동 감지" },
    { id: "manual", label: "수동 제어" },
  ];

  return (
    <div className={`card ${styles.modeCard}`}>
      <div className={styles.modeHead}>
        <div
          className={`kpi-card__icon kpi-card__icon--blue ${styles.modeIcon}`}
        >
          <Cpu size={18} color="#2563eb" />
        </div>

        <div>
          <div className={styles.modeTitle}>운영 모드</div>
          <div className={styles.modeSub}>
            현재 {mode === "auto" ? "자동 감지" : "수동 제어"} 모드
          </div>
        </div>
      </div>

      <div className={`card__divider ${styles.panelDivider}`} />

      <div className={styles.modeList} role="radiogroup">
        {options.map((option) => {
          const active = mode === option.id;

          return (
            <div
              key={option.id}
              className={`mode-option ${
                active ? "mode-option--active" : "mode-option--inactive"
              }`}
              onClick={() => onChange(option.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(option.id);
                }
              }}
              role="radio"
              aria-checked={active}
              tabIndex={0}
            >
              <span
                className={`status-dot ${styles.smallDot} ${
                  active ? "status-dot--green" : "status-dot--gray"
                }`}
              />

              <span className="mode-option__label">{option.label}</span>

              {active && <Check size={14} color="#2563eb" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================================
// 5. 경보 배너
// ========================================
function AlertBanner({ alert, onDismiss }) {
  const text = buildAlertText(alert);

  const value =
    alert.kind === "temp"
      ? formatTemp(alert.value)
      : formatHumidity(alert.value);

  return (
    <div className="alert-banner">
      <div className="alert-banner__header">
        <div className="alert-banner__icon">
          <Bell size={18} color="#fff" />
        </div>

        <div>
          <div className={styles.bannerTitle}>{text.title}</div>
          <div className={styles.bannerSub}>{text.bannerSub}</div>
        </div>
      </div>

      <div className="alert-banner__divider" />

      <div className={styles.bannerInfo}>
        <div className="info-row">
          <Clock size={13} color="#d97706" />
          발생: {formatTime(alert.startedAt)}
        </div>

        <div className="info-row">
          <Thermometer size={13} color="#d97706" />
          현재: {value}
          {alert.unit} ({text.diffText})
        </div>
      </div>

      <button
        type="button"
        className="btn btn--danger btn--full"
        onClick={onDismiss}
      >
        <BellOff size={16} />
        알림 해제
      </button>
    </div>
  );
}

// ========================================
// 6. 통계 패널
// ========================================
function StatsPanel({ stats, isMobile }) {
  const hourLabel = (hour) => {
    if (hour == null || !Number.isFinite(hour)) return "방금";

    const totalMinutes = Math.floor(hour * 60);
    const hours = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");

    return `${hours}:${minutes}`;
  };

  const items = [
    {
      key: "max",
      cls: "orange",
      label: "최고 기록",
      icon: ArrowUp,
      value: stats.max,
      time: `오늘 ${hourLabel(stats.maxHour)}`,
    },
    {
      key: "min",
      cls: "blue",
      label: "최저 기록",
      icon: ArrowDown,
      value: stats.min,
      time: `오늘 ${hourLabel(stats.minHour)}`,
    },
    {
      key: "avg",
      cls: "green",
      label: "평균 온도",
      icon: Activity,
      value: stats.avg,
      time: "최근 측정 기록",
    },
  ];

  if (isMobile) {
    return (
      <div className={styles.threeCol}>
        {items.map(({ key, cls, label, icon: Icon, value, time }) => (
          <div key={key} className={`${styles.statBox} ${styles[cls]}`}>
            <Icon size={14} />
            <span className={styles.statLabel}>{label}</span>
            <span className={styles.statValue}>
              {value == null ? "--" : `${formatTemp(value)}℃`}
            </span>
            <span className={styles.statTime}>{time}</span>
          </div>
        ))}
      </div>
    );
  }

  const textCls = {
    orange: styles.orangeText,
    blue: styles.blueText,
    green: styles.greenText,
  };

  return (
    <div className="stats-panel">
      <div className="stats-panel__title">오늘의 통계</div>

      <div className={`card__divider ${styles.panelDivider}`} />

      {items.map(({ key, cls, label, icon: Icon, value }) => (
        <div key={key} className={`stat-item stat-item--${cls}`}>
          <span className={`stat-label ${textCls[cls]}`}>
            <Icon size={14} />
            {label}
          </span>

          <span className={`stat-value ${textCls[cls]}`}>
            {value == null ? "--" : `${formatTemp(value)}℃`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ========================================
// 7. 모바일 장치 카드
// ========================================
function MiniDevice({ label, tone: miniTone, icon, on, text, sub, onClick }) {
  const canTurnOff = Boolean(on && onClick);

  const handleKeyDown = (e) => {
    if (!canTurnOff) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`card ${styles.mini} ${styles[miniTone]} ${
        canTurnOff ? styles.clickable : ""
      }`}
      onClick={canTurnOff ? onClick : undefined}
      role={canTurnOff ? "button" : undefined}
      tabIndex={canTurnOff ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={canTurnOff ? `${label} 끄기` : undefined}
    >
      <div className={styles.miniIcon}>{icon}</div>

      <div className={styles.miniName}>{label}</div>

      <div className={`${styles.miniState} ${on ? styles.on : ""}`}>
        <span
          className={`status-dot ${styles.miniDot} ${
            on ? styles.on : "status-dot--gray"
          }`}
        />
        {text || (on ? "ON" : "OFF")}
      </div>

      <div className={styles.miniSub}>{canTurnOff ? "눌러서 끄기" : sub}</div>
    </div>
  );
}

// ========================================
// 8. 메인 Dashboard
// ========================================
export default function DashboardView({ data, isMobile, onNavigate }) {
  const { temp, hum, settings, alert, dismissAlert } = data;

  const [history, setHistory] = useState([]);

  // ========================================
  // 날짜 변경 감지: 자정에 그래프 기록 초기화
  // ========================================
  const currentDateRef = useRef(new Date().toDateString());

  useEffect(() => {
    const checkDateChange = () => {
      const today = new Date().toDateString();

      // 날짜가 바뀌었을 때만 초기화
      if (currentDateRef.current !== today) {
        currentDateRef.current = today;

        // 그래프 및 통계 계산에 사용되는 기록 초기화
        setHistory([]);
      }
    };

    // 10초마다 날짜 변경 여부 확인
    const timer = setInterval(checkDateChange, 10 * 1000);

    return () => clearInterval(timer);
  }, []);

  const latestReading = useRef({
    connected: false,
    temp: null,
    hum: null,
  });

  const led = Boolean(data.led);
  const buzzer = Boolean(data.buzzer);

  const mode = data.autoMode === false ? "manual" : "auto";

  // 센서 상태
  const tempStatus =
    temp == null
      ? "unknown"
      : temp < settings.tempMin || temp > settings.tempMax
        ? "danger"
        : "normal";

  const humStatus =
    hum == null
      ? "unknown"
      : hum < settings.humMin || hum > settings.humMax
        ? "danger"
        : "normal";

  // ========================================
  // ESP32 API 요청
  // ========================================
  const sendSettings = async (params) => {
    const query = new URLSearchParams(params).toString();

    const response = await fetch(`${ESP32_IP}/api/settings?${query}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`ESP32 설정 요청 실패: HTTP ${response.status}`);
    }

    return response.json();
  };

  // ========================================
  // 모드 변경
  // ========================================
  const setMode = async (nextMode) => {
    if (nextMode !== "auto" && nextMode !== "manual") return;
    if (nextMode === mode) return;

    try {
      await sendSettings({ mode: nextMode });
    } catch (error) {
      console.error("모드 변경 실패:", error);
      window.alert("모드 변경에 실패했습니다. ESP32 연결을 확인해 주세요.");
    }
  };

  // ========================================
  // 수동 모드: LED만 끄기
  // ========================================
  const toggleLed = async () => {
    if (mode !== "manual" || !led) return;

    try {
      await sendSettings({ led: "0" });
    } catch (error) {
      console.error("LED 끄기 실패:", error);
      window.alert("LED 끄기에 실패했습니다. ESP32 연결을 확인해 주세요.");
    }
  };

  // ========================================
  // 수동 모드: 부저만 끄기
  // ========================================
  const toggleBuzzer = async () => {
    if (mode !== "manual" || !buzzer) return;

    try {
      await sendSettings({ buzzer: "0" });
    } catch (error) {
      console.error("부저 끄기 실패:", error);
      window.alert("부저 끄기에 실패했습니다. ESP32 연결을 확인해 주세요.");
    }
  };

  // ========================================
  // 최신 센서 데이터 보관
  // ========================================
  useEffect(() => {
    latestReading.current = {
      connected: Boolean(data.connected),
      temp,
      hum,
    };
  }, [data.connected, temp, hum]);

  // ========================================
  // 센서 기록 수집
  // ========================================
  useEffect(() => {
    const intervalSeconds = Math.max(1, Number(settings.interval) || 5);

    const timer = setInterval(() => {
      const reading = latestReading.current;

      if (
        !reading.connected ||
        typeof reading.temp !== "number" ||
        !Number.isFinite(reading.temp) ||
        typeof reading.hum !== "number" ||
        !Number.isFinite(reading.hum)
      ) {
        return;
      }

      const now = new Date();

      const point = {
        hour: now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600,
        temp: reading.temp,
        hum: reading.hum,
        timestamp: now.getTime(),
      };

      setHistory((previous) => [...previous, point].slice(-60));
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [settings.interval]);

  // ========================================
  // 통계 계산
  // ========================================
  const tempValues = history.map((point) => point.temp);

  const stats = {
    max: tempValues.length ? Math.max(...tempValues) : null,

    maxHour: tempValues.length
      ? history.reduce((a, b) => (b.temp > a.temp ? b : a)).hour
      : null,

    min: tempValues.length ? Math.min(...tempValues) : null,

    minHour: tempValues.length
      ? history.reduce((a, b) => (b.temp < a.temp ? b : a)).hour
      : null,

    avg: tempValues.length
      ? tempValues.reduce((sum, value) => sum + value, 0) / tempValues.length
      : null,
  };

  // ========================================
  // 센서 카드
  // ========================================
  const tempCard = (
    <SensorCard
      kind="temp"
      value={temp}
      status={tempStatus}
      limits={{
        min: settings.tempMin,
        max: settings.tempMax,
      }}
    />
  );

  const humCard = (
    <SensorCard
      kind="hum"
      value={hum}
      status={humStatus}
      limits={{
        min: settings.humMin,
        max: settings.humMax,
      }}
    />
  );

  // ========================================
  // 그래프 카드
  // ========================================
  const chartCard = (
    <div className={`chart-card ${isMobile ? styles.chartMobile : ""}`}>
      <div
        className={`chart-card__header ${
          isMobile ? styles.chartHeaderMobile : ""
        }`}
      >
        <div>
          <div className="chart-card__title">실시간 변화 추이</div>
          <div className="chart-card__subtitle">
            현재 화면에서 수집한 실제 온·습도 기록
          </div>
        </div>

        <div className="chart-card__legend">
          <span className="legend-item">
            <span className={`legend-item__line ${styles.legendRed}`} />
            온도
          </span>

          <span className="legend-item">
            <span className={`legend-item__line ${styles.legendBlue}`} />
            습도
          </span>

          {!isMobile && (
            <span className={`badge ${styles.rangeBadge}`}>
              <Calendar size={12} />
              최근 기록
            </span>
          )}
        </div>
      </div>

      <TrendChart
        history={history}
        tempMax={settings.tempMax}
        isMobile={isMobile}
      />
    </div>
  );

  // ========================================
  // 모바일 화면
  // ========================================
  if (isMobile) {
    return (
      <div className={`content-area ${styles.content} ${styles.contentMobile}`}>
        <div className={styles.settingsBar}>
          <button
            type="button"
            className="btn btn--outline-primary btn--sm"
            onClick={() => onNavigate("settings")}
          >
            <SlidersHorizontal size={14} />
            센서 범위 설정
          </button>
        </div>

        {data.alert && (
          <AlertBanner alert={data.alert} onDismiss={dismissAlert} />
        )}

        <div className={styles.twoCol}>
          {tempCard}
          {humCard}
        </div>

        <div className={styles.threeCol}>
          <MiniDevice
            label="LED"
            tone="red"
            on={led}
            icon={<Lightbulb size={16} />}
            sub={led ? "작동 중" : "대기"}
            onClick={mode === "manual" && led ? toggleLed : undefined}
          />

          <MiniDevice
            label="부저"
            tone="purple"
            on={buzzer}
            icon={<Volume2 size={16} />}
            sub={buzzer ? "경보 중" : "대기"}
            onClick={mode === "manual" && buzzer ? toggleBuzzer : undefined}
          />

          <MiniDevice
            label="모드"
            tone="blue"
            on
            icon={<Cpu size={16} />}
            text={mode === "auto" ? "자동" : "수동"}
            sub={mode === "auto" ? "자동 감지" : "수동 제어"}
            onClick={() => setMode(mode === "auto" ? "manual" : "auto")}
          />
        </div>

        {chartCard}

        <StatsPanel stats={stats} isMobile />
      </div>
    );
  }

  // ========================================
  // 데스크톱 화면
  // ========================================
  return (
    <div className={`content-area ${styles.content}`}>
      <div className={styles.kpiGrid}>
        {tempCard}
        {humCard}

        <DeviceCard kind="led" on={led} mode={mode} onToggle={toggleLed} />

        <DeviceCard
          kind="buzzer"
          on={buzzer}
          mode={mode}
          onToggle={toggleBuzzer}
        />
      </div>

      <div className={styles.mainGrid}>
        {chartCard}

        <div className={styles.sideCol}>
          {data.alert && (
            <AlertBanner alert={data.alert} onDismiss={dismissAlert} />
          )}

          <ModeCard mode={mode} onChange={setMode} />

          <StatsPanel stats={stats} />
        </div>
      </div>
    </div>
  );
}
