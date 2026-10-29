"use client";
/** 가열·지지 장치 — 핫플레이트(켜지면 상판이 붉게 달아오르고 열기가 아른거림), 스탠드와 클램프, 얼음물 수조 */
import { BENCH_Y, FloorShadow } from "./defs";
import { Beaker, Label } from "./glass";

/** 핫플레이트 — 윗면 y 기준, 높이 30 */
export function HotPlate({ x, y, w = 130, on, label = "핫플레이트" }: { x: number; y: number; w?: number; on: boolean; label?: string }) {
  return (
    <g transform={`translate(${x},${y})`} data-part={on ? `${label} 켜짐` : label}>
      <FloorShadow cx={w / 2} w={w + 10} y={BENCH_Y - y} />
      <rect x="0" y="6" width={w} height={BENCH_Y - y - 6} rx="5" fill="url(#lab-body)" stroke="#94a3b8" />
      <rect x="-2" y="0" width={w + 4} height="8" rx="3" fill={on ? "url(#lab-heat)" : "#475569"} className={on ? "lab-glow" : undefined} />
      <rect x="-2" y="0" width={w + 4} height="2" rx="1" fill="#ffffff" opacity="0.35" />
      <circle cx={w - 18} cy={(BENCH_Y - y) / 2 + 4} r="6" fill="url(#lab-metal)" stroke="#475569" />
      <line x1={w - 18} x2={w - 18} y1={(BENCH_Y - y) / 2} y2={(BENCH_Y - y) / 2 - 2 + (on ? 0 : 4)} stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy={(BENCH_Y - y) / 2 + 4} r="3" fill={on ? "#ef4444" : "#64748b"} className={on ? "lab-blink" : undefined} />
      {on ? <HeatShimmer w={w} /> : null}
      <Label x={w / 2} y={BENCH_Y - y + 16} text={label} />
    </g>
  );
}

function HeatShimmer({ w }: { w: number }) {
  const xs = [0.2, 0.45, 0.7].map((f) => f * w);
  return (
    <g aria-hidden="true" opacity="0.45">
      {xs.map((cx, i) => <path key={cx} className="lab-shimmer" style={{ animationDelay: `${i * 0.4}s` }} d={`M${cx} -2 q4 -6 0 -12 q-4 -6 0 -12`} fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" />)}
    </g>
  );
}

/** 스탠드 — 받침판·막대, 클램프 팔은 armX까지 뻗어 armY 높이에서 물건을 잡는다 */
export function Stand({ x, top, armX, armY, label = "스탠드" }: { x: number; top: number; armX: number; armY: number; label?: string }) {
  const dir = armX >= x ? 1 : -1;
  return (
    <g data-part={label}>
      <FloorShadow cx={x + dir * 18} w={70} />
      <rect x={x - 14 + (dir > 0 ? 0 : -36)} y={BENCH_Y - 7} width="64" height="7" rx="2" fill="url(#lab-metal-v)" stroke="#4b5563" />
      <rect x={x - 3} y={top} width="6" height={BENCH_Y - top - 6} rx="2" fill="url(#lab-metal)" />
      <rect x={x - 6} y={armY - 6} width="12" height="12" rx="2" fill="#374151" />
      <rect x={Math.min(x, armX)} y={armY - 2.5} width={Math.abs(armX - x)} height="5" rx="2" fill="url(#lab-metal-v)" />
      <path d={`M${armX} ${armY - 8} q${dir * 8} 8 0 16`} fill="none" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
      <path d={`M${armX} ${armY - 8} q${-dir * 8} 8 0 16`} fill="none" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** 얼음물 수조 — 비커에 물과 얼음 조각 */
export function IceBath({ x, y, w, h, label = "얼음물", inside }: { x: number; y: number; w: number; h: number; label?: string; inside?: React.ReactNode }) {
  const ice = [[0.14, 0.2], [0.45, 0.12], [0.72, 0.24], [0.3, 0.4]];
  return (
    <Beaker x={x} y={y} w={w} h={h} level={0.72} liquid="ice_water" label={label} inside={
      <g>
        {ice.map(([fx, fy]) => <rect key={`${fx}`} x={fx * w} y={h * 0.28 + fy * h * 0.4} width="13" height="11" rx="3" fill="#ffffff" fillOpacity="0.75" stroke="#bfe3ff" transform={`rotate(${fx * 60 - 15} ${fx * w + 6} ${h * 0.3 + fy * h * 0.4})`} />)}
        {inside}
      </g>
    } />
  );
}
