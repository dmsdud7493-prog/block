/** 장면 공용 SVG 조각 — 가열판·온도계 표시·비커. 수치는 상태/이벤트에 실린 값만 쓴다 */
export function HotPlate({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g transform={`translate(${x},${y})`} aria-label={on ? "가열 장치 켜짐" : "가열 장치"}>
      <rect x="0" y="0" width="120" height="22" rx="4" fill={on ? "#fecaca" : "#e2e8f0"} stroke="#334155" strokeWidth="2" />
      <circle cx="104" cy="11" r="5" fill={on ? "#dc2626" : "#94a3b8"} />
      <text x="60" y="38" textAnchor="middle" fontSize="11" fill="#0f172a">가열 장치</text>
    </g>
  );
}

export function TempBadge({ x, y, temp, label = "온도계" }: { x: number; y: number; temp: number | null; label?: string }) {
  return (
    <g transform={`translate(${x},${y})`} aria-label={temp === null ? label : `${label} ${temp.toFixed(1)}도`}>
      <rect x="0" y="0" width="96" height="34" rx="6" fill="#0f172a" />
      <text x="48" y="22" textAnchor="middle" fontSize="16" fill="#4ade80" fontFamily="monospace">{temp === null ? "--.- ℃" : `${temp.toFixed(1)} ℃`}</text>
      <text x="48" y="48" textAnchor="middle" fontSize="11" fill="#0f172a">{label}</text>
    </g>
  );
}

export function Vessel({ x, y, w, h, level, color, label, children }: { x: number; y: number; w: number; h: number; level: number; color: string; label: string; children?: React.ReactNode }) {
  const lh = Math.max(0, Math.min(1, level)) * (h - 4);
  return (
    <g transform={`translate(${x},${y})`} aria-label={label}>
      <rect x="0" y="0" width={w} height={h} rx="3" fill="#ffffff" stroke="#334155" strokeWidth="2" />
      <rect x="2" y={h - 2 - lh} width={w - 4} height={lh} fill={color} opacity="0.75" />
      {children}
      <text x={w / 2} y={h + 14} textAnchor="middle" fontSize="11" fill="#0f172a">{label}</text>
    </g>
  );
}

export function Bubbles({ x, y, w, n }: { x: number; y: number; w: number; n: number }) {
  return <g>{Array.from({ length: n }, (_, i) => <circle key={i} cx={x + ((i * 37) % w)} cy={y - ((i * 23) % 30)} r={2 + (i % 3)} fill="#ffffff" stroke="#60a5fa" />)}</g>;
}

export const LIQUID: Record<string, string> = { water: "#60a5fa", ethanol: "#c4b5fd", hot_water: "#93c5fd", mixture: "#a5b4fc" };
