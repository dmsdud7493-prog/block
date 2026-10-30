"use client";
/**
 * 움직이는 효과 — 기포(끓기)·김·물방울·따르는 줄기·결정·가루·철조각.
 * 애니메이션은 CSS(globals.css의 lab-*)로 돌고, "동작 줄이기" 설정이면 멈춘다(KWCAG 2.2.2).
 */

/** 그릇 안쪽 좌표의 기포 — 바닥(y)에서 위로 rise만큼 올라가며 사라진다. strength 0~1 */
function Bubble({ i, x, y, w, rise, strength }: { i: number; x: number; y: number; w: number; rise: number; strength: number }) {
  const cx = x + (((i * 37 + 11) % 100) / 100) * w;
  const r = 1.4 + ((i * 7) % 4) * 0.7 * (0.6 + strength);
  const dur = 1.6 - strength * 0.9 + ((i * 13) % 5) / 10;
  const style = { animationDuration: `${dur}s`, animationDelay: `${((i * 0.37) % 1.6).toFixed(2)}s`, ["--rise" as string]: `-${rise}px` };
  return <circle className="lab-bubble" cx={cx} cy={y} r={r} fill="#ffffff" fillOpacity="0.85" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="0.6" style={style} />;
}

/** 그릇 안쪽 좌표의 기포 — 바닥(y)에서 위로 rise만큼 올라가며 사라진다. strength 0~1 */
export function Bubbles({ x, y, w, rise, strength }: { x: number; y: number; w: number; rise: number; strength: number }) {
  const n = Math.round(4 + strength * 14);
  if (strength <= 0.02) return null;
  return <g aria-hidden="true">{Array.from({ length: n }, (_, i) => <Bubble key={i} i={i} x={x} y={y} w={w} rise={rise} strength={strength} />)}</g>;
}

/** 그릇 입구 위로 피어오르는 김 */
export function Steam({ cx, y, w, strength = 1 }: { cx: number; y: number; w: number; strength?: number }) {
  if (strength <= 0.05) return null;
  const xs = [-0.3, 0, 0.3].map((f) => cx + f * w);
  return (
    <g aria-hidden="true" opacity={0.35 + strength * 0.4}>
      {xs.map((sx, i) => <ellipse key={sx} className="lab-steam" cx={sx} cy={y} rx={w * 0.16} ry={w * 0.1} fill="#ffffff" style={{ animationDelay: `${i * 0.6}s` }} />)}
    </g>
  );
}

/** 관 끝에서 똑똑 떨어지는 물방울 */
export function Drips({ x, y, fall = 26, color = "#c9bdf5" }: { x: number; y: number; fall?: number; color?: string }) {
  return (
    <g aria-hidden="true">
      {[0, 0.6].map((d) => <path key={d} className="lab-drip" style={{ animationDelay: `${d}s`, ["--fall" as string]: `${fall}px` }} d={`M${x} ${y} q-3 5 0 7 q3 -2 0 -7`} fill={color} stroke="#7c6fd1" strokeWidth="0.5" />)}
    </g>
  );
}

/** 위에서 아래로 따르는 액체 줄기 — 따르는 단계에 한 번만 흐르고 사라진다(lab-pour-life). 단계마다 key를 바꿔 다시 흐르게 한다 */
export function PourStream({ x, y1, y2, color = "#7cc4f5" }: { x: number; y1: number; y2: number; color?: string }) {
  return (
    <g aria-hidden="true" className="lab-pour-life">
      <path className="lab-pour" d={`M${x} ${y1} C${x + 3} ${y1 + (y2 - y1) * 0.3}, ${x - 1} ${y1 + (y2 - y1) * 0.6}, ${x} ${y2}`} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
      <ellipse className="lab-splash" cx={x} cy={y2} rx="6" ry="2" fill={color} opacity="0.6" />
    </g>
  );
}

/** 결정 — 반짝이는 작은 다면체들. amount 0~1 */
function Crystal({ i, x, y, w, color }: { i: number; x: number; y: number; w: number; color: string }) {
  const cx = x + (((i * 29 + 7) % 100) / 100) * w;
  const cy = y - ((i * 17) % 7) - (i % 3) * 2;
  const sz = 2.2 + (i % 3);
  return <path className={i % 4 === 0 ? "lab-glint" : undefined} d={`M${cx} ${cy - sz} L${cx + sz * 0.8} ${cy} L${cx} ${cy + sz} L${cx - sz * 0.8} ${cy} Z`} fill={color} stroke="#94a3b8" strokeWidth="0.5" />;
}

/** 결정 — 반짝이는 작은 다면체들. amount 0~1 */
export function Crystals({ x, y, w, amount, color = "#ffffff" }: { x: number; y: number; w: number; amount: number; color?: string }) {
  if (amount <= 0) return null;
  const n = Math.round(3 + amount * 14);
  return <g data-part="결정">{Array.from({ length: n }, (_, i) => <Crystal key={i} i={i} x={x} y={y} w={w} color={color} />)}</g>;
}

/** 바닥에 쌓인 가루(녹지 않은 고체) — 높이 h */
export function Powder({ x, y, w, h, color = "#e5e7eb" }: { x: number; y: number; w: number; h: number; color?: string }) {
  if (h <= 0.2) return null;
  return <path data-part="녹지 않은 고체" d={`M${x} ${y} Q${x + w * 0.25} ${y - h * 1.2} ${x + w / 2} ${y - h} Q${x + w * 0.75} ${y - h * 1.3} ${x + w} ${y} Z`} fill={color} stroke="#cbd5e1" strokeWidth="0.6" />;
}

/** 철조각 — 입체감 있는 금속 덩어리 */
export function IronPiece({ x, y, s, label }: { x: number; y: number; s: number; label?: string }) {
  return (
    <g data-part={label} transform={`translate(${x},${y})`}>
      <path d={`M0 ${s * 0.3} L${s * 0.3} 0 L${s * 1.3} 0 L${s} ${s * 0.3} Z`} fill="#9ca3af" />
      <path d={`M${s} ${s * 0.3} L${s * 1.3} 0 L${s * 1.3} ${s} L${s} ${s * 1.3} Z`} fill="#4b5563" />
      <rect x="0" y={s * 0.3} width={s} height={s} fill="url(#lab-metal)" />
    </g>
  );
}

/** 끓임쪽 — 작은 흰 조각 */
export function BoilingChips({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g data-part="끓임쪽">
      {[0.2, 0.42, 0.63, 0.8].map((f) => <path key={f} d={`M${x + f * w} ${y} l3 -3 l3 1 l-1 3 z`} fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.6" />)}
    </g>
  );
}
