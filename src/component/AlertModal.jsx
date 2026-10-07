import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Clock,
  History,
  SlidersHorizontal,
  Timer,
  X,
  Zap,
} from "lucide-react";
import {
  buildAlertText,
  formatDateTime,
  formatDuration,
  formatHumidity,
  formatTemp,
} from "../utils/formatters";
import styles from "./AlertModal.module.scss";

export default function AlertModal({
  alert,
  isMobile,
  onDismiss,
  onClose,
  onOpenSettings,
  onOpenHistory,
}) {
  // 경보 지속 시간 (1초마다 갱신)
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!alert) return undefined;
    const calc = () =>
      setElapsed((Date.now() - new Date(alert.startedAt).getTime()) / 1000);
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [alert]);

  // ESC 로 닫기
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!alert) return null;

  const text = buildAlertText(alert);
  const fmt = alert.kind === "temp" ? formatTemp : formatHumidity;

  return (
    <div
      className={`overlay ${styles.overlay}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`modal ${styles.modal} ${isMobile ? styles.modalMobile : ""}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__accent-bar" />
        <div className={`modal__body ${isMobile ? styles.bodyMobile : ""}`}>
          <div className="modal__icon-group">
            <div className="ring-outer">
              <div className="ring-inner">
                <Bell size={22} color="#fff" />
              </div>
            </div>
          </div>

          <div className={styles.head}>
            <h2 id="alert-title" className={styles.title}>
              <AlertTriangle size={20} />
              {text.title}
            </h2>
            <p className={styles.sub}>{text.modalSub}</p>
          </div>

          <div className={styles.values}>
            <div className={`${styles.valueBox} ${styles.danger}`}>
              <span className={styles.valueLabel}>{text.currentLabel}</span>
              <span className={styles.valueNumber}>
                {fmt(alert.value)}
                <span className={styles.valueUnit}>{alert.unit}</span>
              </span>
              <span className="badge badge--danger">{text.badge}</span>
            </div>
            <div className={`${styles.valueBox} ${styles.blue}`}>
              <span className={styles.valueLabel}>{text.limitLabel}</span>
              <span className={styles.valueNumber}>
                {alert.limit}
                <span className={styles.valueUnit}>{alert.unit}</span>
              </span>
              <span className="badge badge--primary">임계값</span>
            </div>
          </div>

          <div
            className={`info-banner info-banner--warning ${styles.infoList}`}
          >
            <div className={styles.infoRow}>
              <Clock size={14} /> <span>경보 발생 시각</span>
              <strong>{formatDateTime(alert.startedAt)}</strong>
            </div>
            <div className={styles.infoRow}>
              <Zap size={14} /> <span>LED 점멸 · 부저 경보 동시 작동 중</span>
            </div>
            <div className={styles.infoRow}>
              <Timer size={14} /> <span>경보 지속 시간</span>
              <strong>{formatDuration(elapsed)}</strong>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn--danger btn--lg btn--full"
              onClick={onDismiss}
            >
              <BellOff size={18} /> 알림 해제
            </button>
            <div
              className={`${styles.subActions} ${isMobile ? styles.mobile : ""}`}
            >
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={onOpenSettings}
              >
                <SlidersHorizontal size={13} />{" "}
                {isMobile ? "설정 변경" : "센서 설정 변경"}
              </button>
              {!isMobile && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={onOpenHistory}
                >
                  <History size={13} /> 알림 이력 보기
                </button>
              )}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={onClose}
              >
                <X size={13} /> 무시
              </button>
            </div>
          </div>

          <p className={styles.footnote}>
            경보는 알림 해제 시까지 계속 울립니다
          </p>
        </div>
      </div>
    </div>
  );
}
