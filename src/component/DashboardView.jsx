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

/* ────────────────────────────────────────────────────────────
   실시간 변화 추이 차트 (SVG)
   왼쪽 축: 온도(°C, 0~40) / 오른쪽 축: 습도(%, 0~100)
──────────────────────────────────────────────────────────── */
function TrendChart({ history, tempMax, isMobile }) {
  const W = isMobile ? 340 : 700;
  const H = isMobile ? 190 : 260;
  const m = { l: 34, r: 34, t: 28, b: 24 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;

  const x = (hour) => m.l + (hour / 24) * iw;
  const yTemp = (v) => m.t + ih - (v / 40) * ih;
  const yHum = (v) => m.t + ih - (v / 100) * ih;
  const closeArea = (line) =>
    `${line} L ${x(24)} ${m.t + ih} L ${x(0)} ${m.t + ih} Z`;

  const tempLine = smoothPath(history.map((p) => [x(p.hour), yTemp(p.temp)]));
  const humLine = smoothPath(history.map((p) => [x(p.hour), yHum(p.hum)]));

  const peak = history.reduce((a, b) => (b.temp > a.temp ? b : a), history[0]);
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
      aria-label="최근 24시간 온도·습도 변화 그래프"
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
        {pad(peak.hour)}:00 기록
      </text>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   부품
──────────────────────────────────────────────────────────── */
const tone = (status) => (status === "normal" ? "success" : "danger");

function SensorCard({ kind, value, status, limits }) {
  const isTemp = kind === "temp";
  const t = tone(status);
  const pct = toPercent(value, 0, isTemp ? 50 : 100);
  const unit = isTemp ? "°C" : "%";

  return (
    <div
      className={`kpi-card ${status !== "normal" && isTemp ? styles.cardDanger : ""}`}
    >
      <div className="kpi-card__header">
        <div
          className={`kpi-card__icon kpi-card__icon--${isTemp ? "red" : "green"}`}
        >
          {isTemp ? (
            <Thermometer size={20} color="#ef4444" />
          ) : (
            <Droplets size={20} color="#22c55e" />
          )}
        </div>
        <span className={`kpi-card__badge kpi-card__badge--${t}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <span className="kpi-card__label">
        {isTemp ? "현재 온도" : "현재 습도"}
      </span>
      <div className="kpi-card__value">
        <span
          className={`kpi-card__value--number kpi-card__value--number-lg ${t}`}
        >
          {isTemp ? formatTemp(value) : formatHumidity(value)}
        </span>
        <span className={`kpi-card__value--unit ${t} ${styles.unit}`}>
          {isTemp ? "℃" : "%"}
        </span>
      </div>
      <div>
        <div className="progress-bar">
          <div
            className={`progress-bar__fill progress-bar__fill--${isTemp ? "temp" : "hum"}`}
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

function DeviceCard({ kind, on, mode, onToggle }) {
  const isLed = kind === "led";
  const manual = mode === "manual";
  const onKey = (e) => (e.key === "Enter" || e.key === " ") && onToggle();

  let desc = "정상 · 대기 중";
  if (manual) desc = "클릭하여 켜기/끄기";
  else if (on) desc = isLed ? "점멸 중 · 경보 감지" : "경보 작동 중 · 5초 주기";

  return (
    <div
      className={`kpi-card ${manual ? styles.clickable : ""}`}
      onClick={manual ? onToggle : undefined}
      onKeyDown={manual ? onKey : undefined}
      role={manual ? "button" : undefined}
      tabIndex={manual ? 0 : undefined}
    >
      <div className="kpi-card__header">
        <div
          className={`kpi-card__icon kpi-card__icon--${isLed ? "red" : "purple"}`}
        >
          {isLed ? (
            <Lightbulb size={20} color="#ef4444" />
          ) : (
            <Volume2 size={20} color="#7c3aed" />
          )}
        </div>
        <span
          className={`kpi-card__badge kpi-card__badge--${isLed ? "danger" : "warning"} ${on ? "" : styles.badgeIdle}`}
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
          className={`status-dot ${on ? `status-dot--${isLed ? "red" : "purple"} status-dot--pulse` : "status-dot--gray"}`}
        />
      </div>
      <span className={styles.desc}>{desc}</span>
    </div>
  );
}

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
        {options.map((o) => {
          const active = mode === o.id;
          return (
            <div
              key={o.id}
              className={`mode-option ${active ? "mode-option--active" : "mode-option--inactive"}`}
              onClick={() => onChange(o.id)}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && onChange(o.id)
              }
              role="radio"
              aria-checked={active}
              tabIndex={0}
            >
              <span
                className={`status-dot ${styles.smallDot} ${active ? "status-dot--green" : "status-dot--gray"}`}
              />
              <span className="mode-option__label">{o.label}</span>
              {active && <Check size={14} color="#2563eb" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
          <Clock size={13} color="#d97706" /> 발생:{" "}
          {formatTime(alert.startedAt)}
        </div>
        <div className="info-row">
          <Thermometer size={13} color="#d97706" /> 현재: {value}
          {alert.unit} ({text.diffText})
        </div>
      </div>
      <button
        type="button"
        className="btn btn--danger btn--full"
        onClick={onDismiss}
      >
        <BellOff size={16} /> 알림 해제
      </button>
    </div>
  );
}

function StatsPanel({ stats, isMobile }) {
  const hourLabel = (h) => (h === null ? "방금" : `${pad(h)}:00`);
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
      time: "최근 24시간",
    },
  ];

  // 모바일 : 3개의 색상 박스
  if (isMobile) {
    return (
      <div className={styles.threeCol}>
        {items.map(({ key, cls, label, icon: Icon, value, time }) => (
          <div key={key} className={`${styles.statBox} ${styles[cls]}`}>
            <Icon size={14} />
            <span className={styles.statLabel}>{label}</span>
            <span className={styles.statValue}>{formatTemp(value)}℃</span>
            <span className={styles.statTime}>{time}</span>
          </div>
        ))}
      </div>
    );
  }

  // 데스크탑 : 우측 패널
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
            <Icon size={14} /> {label}
          </span>
          <span className={`stat-value ${textCls[cls]}`}>
            {formatTemp(value)}℃
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniDevice({ label, tone: miniTone, icon, on, text, sub, onClick }) {
  return (
    <div
      className={`card ${styles.mini} ${styles[miniTone]} ${onClick ? styles.clickable : ""}`}
      onClick={onClick}
    >
      <div className={styles.miniIcon}>{icon}</div>
      <div className={styles.miniName}>{label}</div>
      <div className={`${styles.miniState} ${on ? styles.on : ""}`}>
        <span
          className={`status-dot ${styles.miniDot} ${on ? styles.on : "status-dot--gray"}`}
        />
        {text || (on ? "ON" : "OFF")}
      </div>
      <div className={styles.miniSub}>{sub}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Dashboard
──────────────────────────────────────────────────────────── */
export default function DashboardView({ data, isMobile, onNavigate }) {
  const {
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
    dismissAlert,
    toggleLed,
    toggleBuzzer,
  } = data;

  const tempCard = (
    <SensorCard
      kind="temp"
      value={temp}
      status={tempStatus}
      limits={{ min: settings.tempMin, max: settings.tempMax }}
    />
  );
  const humCard = (
    <SensorCard
      kind="hum"
      value={hum}
      status={humStatus}
      limits={{ min: settings.humMin, max: settings.humMax }}
    />
  );

  const chartCard = (
    <div className={`chart-card ${isMobile ? styles.chartMobile : ""}`}>
      <div
        className={`chart-card__header ${isMobile ? styles.chartHeaderMobile : ""}`}
      >
        <div>
          <div className="chart-card__title">실시간 변화 추이</div>
          <div className="chart-card__subtitle">최근 24시간 온·습도 기록</div>
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
              <Calendar size={12} /> 최근 24시간
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

  /* ───── Mobile ───── */
  if (isMobile) {
    return (
      <div className={`content-area ${styles.content} ${styles.contentMobile}`}>
        {/* 헤더에 메뉴가 없는 모바일에서만 표시 */}
        <div className={styles.settingsBar}>
          <button
            type="button"
            className="btn btn--outline-primary btn--sm"
            onClick={() => onNavigate("settings")}
          >
            <SlidersHorizontal size={14} /> 센서 범위 설정
          </button>
        </div>

        {alert && <AlertBanner alert={alert} onDismiss={dismissAlert} />}

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
            sub={led ? "점멸 중" : "대기"}
            onClick={mode === "manual" ? toggleLed : undefined}
          />
          <MiniDevice
            label="부저"
            tone="purple"
            on={buzzer}
            icon={<Volume2 size={16} />}
            sub={buzzer ? "경보 중" : "대기"}
            onClick={mode === "manual" ? toggleBuzzer : undefined}
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

  /* ───── Desktop (센서 범위 설정 버튼 없음 — 헤더 메뉴 사용) ───── */
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
          {alert && <AlertBanner alert={alert} onDismiss={dismissAlert} />}
          <ModeCard mode={mode} onChange={setMode} />
          <StatsPanel stats={stats} />
        </div>
      </div>
    </div>
  );
}
