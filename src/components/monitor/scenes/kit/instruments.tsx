"use client";
/** 측정 기구 — 유리 온도계(빨간 기둥이 천천히 오르내림)·디지털 표시창·전자저울·고무관·마개 */
import { BENCH_Y, FloorShadow } from "./defs";
import { Label } from "./glass";

const ok = (t: number | null | undefined): t is number => typeof t === "number" && Number.isFinite(t);
const frac = (t: number | null, min: number, max: number) => (!ok(t) ? 0.06 : Math.max(0.04, Math.min(1, (t - min) / (max - min))));

/** 유리 온도계 — (x, top)에서 아래로 len 길이, 아래 끝이 액체에 잠기는 구 */
export function Thermometer({ x, top, len, temp, min = -10, max = 110, label }: { x: number; top: number; len: number; temp: number | null; min?: number; max?: number; label?: string }) {
  const colH = len - 12;
  const f = frac(temp, min, max);
  const ticks = Array.from({ length: 13 }, (_, i) => i);
  return (
    <g transform={`translate(${x - 4},${top})`} data-part={label ?? (!ok(temp) ? "온도계" : `온도계 ${temp.toFixed(1)}도`)}>
      <rect x="0" y="0" width="8" height={len} rx="4" fill="#f8fbff" stroke="#94a3b8" strokeWidth="1.2" />
      {ticks.map((i) => <line key={i} x1={i % 5 === 0 ? 4.5 : 5.5} x2="8" y1={colH - (colH * i) / 12} y2={colH - (colH * i) / 12} stroke="#64748b" strokeWidth="0.6" />)}
      <rect x="2.6" y="2" width="2.8" height={colH} fill="#dc2626" className="lab-thermo" style={{ transform: `scaleY(${f})` }} />
      <circle cx="4" cy={len - 2} r="5.5" fill="#dc2626" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="2.4" cy={len - 3.6} r="1.4" fill="#ffffff" opacity="0.7" />
      <rect x="1.2" y="3" width="1.4" height={len - 14} rx="0.7" fill="#ffffff" opacity="0.8" />
    </g>
  );
}

/** 디지털 온도 표시창 — 숫자는 상태에 실린 값만 */
export function Readout({ x, y, value, unit = "℃", label, w = 92 }: { x: number; y: number; value: number | null; unit?: string; label?: string; w?: number }) {
  const text = !ok(value) ? `--.- ${unit}` : `${value.toFixed(1)} ${unit}`;
  return (
    <g transform={`translate(${x},${y})`} data-part={label ? `${label} ${text}` : text} filter="url(#lab-shadow)">
      <rect x="0" y="0" width={w} height="30" rx="7" fill="#111827" stroke="#374151" />
      <rect x="4" y="4" width={w - 8} height="22" rx="4" fill="#0b2b1d" />
      <text x={w - 9} y="21" textAnchor="end" fontSize="15" fontWeight="700" fill="#4ade80" fontFamily="'Courier New', monospace">{text}</text>
      {label ? <text x={w / 2} y="42" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#1f2d3d">{label}</text> : null}
    </g>
  );
}

/** 전자저울 — 스테인리스 접시 + 초록 LCD + TARE 단추. children은 접시 위(접시 윗면 y=0)에 그린다 */
export function Scale({ x, w = 150, reading, label = "전자저울", children }: { x: number; w?: number; reading: string; label?: string; children?: React.ReactNode }) {
  const top = BENCH_Y - 34;
  return (
    <g transform={`translate(${x},${top})`} data-part={`${label} ${reading}`}>
      <FloorShadow cx={w / 2} w={w + 8} y={34} />
      <path d={`M0 34 L6 8 L${w - 6} 8 L${w} 34 Z`} fill="url(#lab-body)" stroke="#94a3b8" />
      <rect x={w / 2 - 46} y="15" width="66" height="15" rx="2" fill="#0b2b1d" stroke="#1f2937" />
      <text x={w / 2 + 16} y="26.5" textAnchor="end" fontSize="11" fontWeight="700" fill="#4ade80" fontFamily="'Courier New', monospace">{reading}</text>
      <rect x={w / 2 + 26} y="17" width="22" height="11" rx="2" fill="#2563eb" />
      <text x={w / 2 + 37} y="25" textAnchor="middle" fontSize="6" fontWeight="700" fill="#ffffff">TARE</text>
      <rect x={w * 0.18} y="1" width={w * 0.64} height="7" rx="3.5" fill="url(#lab-metal-v)" stroke="#6b7280" />
      <g transform={`translate(${w / 2},1)`}>{children}</g>
      <Label x={w / 2} y={50} text={label} />
    </g>
  );
}

/** 고무관 — 두꺼운 갈색 관 + 윗면 반사 */
export function RubberTube({ d, label = "고무관" }: { d: string; label?: string }) {
  return (
    <g data-part={label}>
      <path d={d} fill="none" stroke="#5b2a17" strokeWidth="7" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#a5532f" strokeWidth="4.5" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#e7a17c" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" transform="translate(-0.8,-1.2)" />
    </g>
  );
}

/** 고무마개 — 위가 넓은 사다리꼴 */
export function Stopper({ x, y, w, label = "고무마개" }: { x: number; y: number; w: number; label?: string }) {
  return <path data-part={label} d={`M${x - w / 2 - 2} ${y} L${x + w / 2 + 2} ${y} L${x + w / 2 - 1} ${y + 9} L${x - w / 2 + 1} ${y + 9} Z`} fill="#7c2d12" stroke="#431407" strokeWidth="1" />;
}
