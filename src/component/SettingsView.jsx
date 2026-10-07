import { useEffect, useRef, useState } from "react";
import {
  Check,
  Droplets,
  Info,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Thermometer,
  Timer,
} from "lucide-react";
import { DEFAULT_SETTINGS } from "../hooks/useArduinoData";
import { clamp, formatInterval } from "../utils/formatters";
import styles from "./SettingsView.module.scss";

const INTERVALS = [1, 5, 10, 30, 60, 300];

/* ────────────────────────────────────────────────────────────
   듀얼 썸 범위 슬라이더 (포인터 드래그)
──────────────────────────────────────────────────────────── */
function RangeSlider({
  min,
  max,
  low,
  high,
  step = 1,
  variant,
  labels,
  onChange,
}) {
  const trackRef = useRef(null);
  const pct = (v) => ((v - min) / (max - min)) * 100;

  const valueFromEvent = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return Math.round((min + ratio * (max - min)) / step) * step;
  };

  const startDrag = (e) => e.currentTarget.setPointerCapture(e.pointerId);
  const drag = (which) => (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const v = valueFromEvent(e);
    if (which === "low") onChange(clamp(v, min, high - step), high);
    else onChange(low, clamp(v, low + step, max));
  };

  const highColor = variant === "temp" ? "red" : "green";

  return (
    <div className={styles.sliderPad}>
      <div className="range-slider" ref={trackRef}>
        <div
          className={`range-slider__fill range-slider__fill--${variant}`}
          style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }}
        />
        <div
          className={`range-slider__thumb range-slider__thumb--blue ${styles.thumb}`}
          style={{ left: `${pct(low)}%` }}
          onPointerDown={startDrag}
          onPointerMove={drag("low")}
          role="slider"
          aria-label="하한"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={low}
        />
        <div
          className={`range-slider__thumb range-slider__thumb--${highColor} ${styles.thumb}`}
          style={{ left: `${pct(high)}%` }}
          onPointerDown={startDrag}
          onPointerMove={drag("high")}
          role="slider"
          aria-label="상한"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={high}
        />
      </div>
      <div className="range-slider__scale">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* 값 박스 + (−) (+) 스테퍼 */
function ValueField({ label, value, unit, tone, rightBtn, onMinus, onPlus }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={`value-input value-input--${tone}`}>
        <span className="value-number">{value}</span>
        <span className="value-unit">{unit}</span>
      </div>
      <div className={`stepper ${styles.stepperRow}`}>
        <button
          type="button"
          className="stepper__btn stepper__btn--left"
          onClick={onMinus}
          aria-label={`${label} 감소`}
        >
          <Minus size={14} color="#6b7280" />
        </button>
        <button
          type="button"
          className={`stepper__btn stepper__btn--${rightBtn}`}
          onClick={onPlus}
          aria-label={`${label} 증가`}
        >
          <Plus size={14} color="#fff" />
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ iconClass, icon, title, desc, right }) {
  return (
    <>
      <div className={styles.titleRow}>
        <div className={styles.titleLeft}>
          <div className={`kpi-card__icon ${iconClass} ${styles.iconBox}`}>
            {icon}
          </div>
          <div>
            <div className={styles.titleText}>{title}</div>
            <div className={styles.titleDesc}>{desc}</div>
          </div>
        </div>
        {right}
      </div>
      <div className="settings-card__divider" />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Settings
──────────────────────────────────────────────────────────── */
export default function SettingsView({ settings, isMobile, onSave }) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(settings), [settings]);
  useEffect(() => {
    if (!saved) return undefined;
    const id = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(id);
  }, [saved]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const handleSave = () => {
    onSave(draft);
    setSaved(true);
  };
  const handleReset = () => setDraft(DEFAULT_SETTINGS);

  const actions = (
    <div className={styles.actions}>
      {saved && (
        <span className={styles.savedMsg}>
          <Check size={13} /> 저장됨
        </span>
      )}
      <button
        type="button"
        className={`btn btn--ghost ${styles.ghost}`}
        onClick={handleReset}
      >
        <RotateCcw size={15} /> 초기화
      </button>
      <button
        type="button"
        className={`btn btn--primary ${styles.primary}`}
        onClick={handleSave}
      >
        <Save size={15} /> 설정 저장
      </button>
    </div>
  );

  return (
    <div
      className={`content-area ${styles.root} ${isMobile ? styles.rootMobile : ""}`}
    >
      {!isMobile && (
        <div className={styles.head}>
          <div>
            <h1 className={styles.pageTitle}>센서 범위 설정</h1>
            <p className={styles.pageSub}>
              알림 임계값 및 측정 주기를 설정합니다
            </p>
          </div>
          {actions}
        </div>
      )}

      <div className={styles.grid}>
        {/* 온도 */}
        <section className="settings-card">
          <SectionTitle
            iconClass="kpi-card__icon--red"
            icon={<Thermometer size={18} color="#ef4444" />}
            title="온도 설정"
            desc="알림 온도 범위를 설정하세요"
          />
          <div className={styles.fields}>
            <ValueField
              label="최고 온도 (상한)"
              value={draft.tempMax}
              unit="℃"
              tone="temp"
              rightBtn="right-red"
              onMinus={() =>
                set({
                  tempMax: clamp(draft.tempMax - 1, draft.tempMin + 1, 40),
                })
              }
              onPlus={() =>
                set({
                  tempMax: clamp(draft.tempMax + 1, draft.tempMin + 1, 40),
                })
              }
            />
            <div className={styles.fieldDivider} />
            <ValueField
              label="최저 온도 (하한)"
              value={draft.tempMin}
              unit="℃"
              tone="blue"
              rightBtn="right-blue"
              onMinus={() =>
                set({ tempMin: clamp(draft.tempMin - 1, 0, draft.tempMax - 1) })
              }
              onPlus={() =>
                set({ tempMin: clamp(draft.tempMin + 1, 0, draft.tempMax - 1) })
              }
            />
          </div>

          <div className={styles.sliderBlock}>
            <div className={styles.sliderHead}>
              <strong>범위 슬라이더</strong>
              <strong className={styles.rangeTemp}>
                {draft.tempMin}°C ~ {draft.tempMax}°C
              </strong>
            </div>
            <RangeSlider
              min={0}
              max={40}
              low={draft.tempMin}
              high={draft.tempMax}
              variant="temp"
              labels={["0°C", "10°C", "20°C", "30°C", "40°C"]}
              onChange={(lo, hi) => set({ tempMin: lo, tempMax: hi })}
            />
          </div>

          <div
            className={`info-banner info-banner--warning ${styles.bannerGap}`}
          >
            <Info size={14} />
            <span className="info-banner__text">
              범위를 벗어나면 LED 및 부저가 작동합니다.
            </span>
          </div>
        </section>

        {/* 습도 */}
        <section className="settings-card">
          <SectionTitle
            iconClass="kpi-card__icon--green"
            icon={<Droplets size={18} color="#22c55e" />}
            title="습도 설정"
            desc="알림 습도 범위를 설정하세요"
          />
          <div className={styles.fields}>
            <ValueField
              label="최고 습도 (상한)"
              value={draft.humMax}
              unit="%"
              tone="hum"
              rightBtn="right-green"
              onMinus={() =>
                set({ humMax: clamp(draft.humMax - 1, draft.humMin + 1, 100) })
              }
              onPlus={() =>
                set({ humMax: clamp(draft.humMax + 1, draft.humMin + 1, 100) })
              }
            />
            <div className={styles.fieldDivider} />
            <ValueField
              label="최저 습도 (하한)"
              value={draft.humMin}
              unit="%"
              tone="blue"
              rightBtn="right-blue"
              onMinus={() =>
                set({ humMin: clamp(draft.humMin - 1, 0, draft.humMax - 1) })
              }
              onPlus={() =>
                set({ humMin: clamp(draft.humMin + 1, 0, draft.humMax - 1) })
              }
            />
          </div>

          <div className={styles.sliderBlock}>
            <div className={styles.sliderHead}>
              <strong>범위 슬라이더</strong>
              <strong className={styles.rangeHum}>
                {draft.humMin}% ~ {draft.humMax}%
              </strong>
            </div>
            <RangeSlider
              min={0}
              max={100}
              low={draft.humMin}
              high={draft.humMax}
              variant="hum"
              labels={["0%", "25%", "50%", "75%", "100%"]}
              onChange={(lo, hi) => set({ humMin: lo, humMax: hi })}
            />
          </div>

          <div
            className={`info-banner info-banner--success ${styles.bannerGap}`}
          >
            <Info size={14} />
            <span className="info-banner__text">
              습도가 범위를 벗어나면 환기 알림이 발생합니다.
            </span>
          </div>
        </section>
      </div>

      {/* 측정 주기 */}
      <section className="settings-card">
        <SectionTitle
          iconClass="kpi-card__icon--purple"
          icon={<Timer size={18} color="#7c3aed" />}
          title="측정 주기"
          desc="Arduino 센서 데이터 수집 간격"
          right={
            <strong className={styles.currentInterval}>
              현재: {formatInterval(settings.interval)}
            </strong>
          }
        />
        <div className="interval-options">
          {INTERVALS.map((sec) => {
            const selected = draft.interval === sec;
            const cls = selected
              ? "interval-btn--active"
              : settings.interval === sec
                ? "interval-btn--outline"
                : "interval-btn--inactive";
            return (
              <button
                key={sec}
                type="button"
                className={`interval-btn ${cls} ${styles.intervalBtn}`}
                onClick={() => set({ interval: sec })}
              >
                {selected && <Check size={12} />}
                {formatInterval(sec)}
              </button>
            );
          })}
        </div>
      </section>

      {/* 모바일 하단 고정 액션 */}
      {isMobile && <div className={styles.mobileBar}>{actions}</div>}
    </div>
  );
}
