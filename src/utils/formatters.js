// ============================================================
// formatters.js — 포맷/계산 유틸
// ============================================================

export const pad = (n) => String(n).padStart(2, "0");

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Date → 14:32:07 */
export const formatTime = (date) => {
  if (!date) return "--:--:--";
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** Date → 2025.06.12 14:32:07 */
export const formatDateTime = (date) => {
  if (!date) return "----.--.-- --:--:--";
  const d = new Date(date);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${formatTime(d)}`;
};

/** 초 → 00:03:42 */
export const formatDuration = (totalSec) => {
  const s = Math.max(0, Math.floor(totalSec));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export const formatTemp = (v) => Number(v).toFixed(1);
export const formatHumidity = (v) => Math.round(Number(v));

/** 5 → 5초, 60 → 1분 */
export const formatInterval = (sec) =>
  sec >= 60 ? `${sec / 60}분` : `${sec}초`;

/** value 를 min~max 범위의 0~100(%) 로 변환 */
export const toPercent = (value, min, max) =>
  clamp(((value - min) / (max - min)) * 100, 0, 100);

/** 'high' | 'low' | 'normal' */
export const getRangeStatus = (value, min, max) => {
  if (value > max) return "high";
  if (value < min) return "low";
  return "normal";
};

export const STATUS_LABEL = { high: "초과", low: "미달", normal: "정상" };

/** 경보 객체 → 화면에 보여줄 문구 */
export const buildAlertText = (alert) => {
  if (!alert) return null;
  const name = alert.kind === "temp" ? "온도" : "습도";
  const high = alert.direction === "high";
  const limitName = high ? "상한" : "하한";
  const diff = Math.abs(alert.value - alert.limit);
  const sign = high ? "+" : "-";

  return {
    title: `${name} 경보 발생!`,
    bannerSub: `${limitName}값 ${alert.limit}${alert.unit} ${high ? "초과" : "미달"}`,
    modalSub: `설정 ${limitName}값을 ${high ? "초과" : "미달"}했습니다`,
    currentLabel: `현재 ${name}`,
    limitLabel: `설정 ${limitName}값`,
    badge: high ? "상한 초과" : "하한 미달",
    diffText: `${limitName} ${sign}${alert.kind === "temp" ? diff.toFixed(1) : Math.round(diff)}${alert.unit}`,
  };
};

/** [[x,y], ...] → 부드러운 SVG 베지어 path (차트용) */
export const smoothPath = (pts) => {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
};
