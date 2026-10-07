import { useEffect, useState } from "react";
import { ChevronLeft, Clock, Thermometer } from "lucide-react";
import { formatDateTime } from "../utils/formatters";
import styles from "./Header.module.scss";

const NAV_ITEMS = [
  { id: "dashboard", label: "대시보드" },
  { id: "settings", label: "센서 범위 설정" },
];

// 실시간 시계 (Header 안에서만 리렌더링되도록 분리)
function Clock24() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="time-display">
      <Clock size={14} />
      <span>{formatDateTime(now)}</span>
    </div>
  );
}

export default function Header({ view, onNavigate, connected, isMobile }) {
  // ───────── Mobile ─────────
  if (isMobile) {
    const isSettings = view === "settings";
    return (
      <header className="app-header--mobile mobile-header">
        <div className="header-main">
          <div className={styles.mobileLeft}>
            {isSettings && (
              <button
                type="button"
                aria-label="뒤로가기"
                className={styles.backBtn}
                onClick={() => onNavigate("dashboard")}
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <div>
              <div className={styles.mobileTitle}>
                {isSettings ? "센서 범위 설정" : "환경 모니터링"}
              </div>
              <div className={styles.mobileSub}>
                {isSettings ? "알림 임계값 설정" : "Arduino IoT Dashboard"}
              </div>
            </div>
          </div>

          {!isSettings && (
            <div
              className={`${styles.mobilePill} ${connected ? "" : styles.off}`}
            >
              <span
                className={`status-dot status-dot--pulse ${styles.pillDot}`}
              />
              {connected ? "연결됨" : "끊김"}
            </div>
          )}
        </div>
      </header>
    );
  }

  // ───────── Desktop ─────────
  return (
    <header className="app-header">
      <div className="header-logo">
        <div className="header-logo__icon">
          <Thermometer size={20} color="#fff" />
        </div>
        <div>
          <div className="header-logo__title">환경 모니터링</div>
          <div className="header-logo__subtitle">Arduino IoT Dashboard</div>
        </div>
      </div>

      <nav className="header-nav" aria-label="메인 메뉴">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-link ${view === item.id ? "nav-link--active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
        <span className="nav-divider" />
        <div className="header-status">
          <div className={`status-pill ${connected ? "" : styles.pillOff}`}>
            <span className="status-pill__dot" />
            <span className="status-pill__text">
              {connected ? "Arduino 연결됨" : "연결 끊김"}
            </span>
          </div>
          <Clock24 />
        </div>
      </nav>
    </header>
  );
}
