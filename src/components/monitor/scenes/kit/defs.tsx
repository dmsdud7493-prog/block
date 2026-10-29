/**
 * 실험 장면 공용 SVG 정의 — 유리 광택, 금속, 그림자, 실험대 배경.
 * 장면마다 <LabDefs/>를 한 번 넣고 url(#lab-…)로 쓴다. (한 화면에 장면은 하나라 id가 겹치지 않는다)
 */

export const VIEW_W = 440;
export const VIEW_H = 275;
/** 실험대 윗면 높이 — 장치는 이 선 위에 선다 */
export const BENCH_Y = 238;

export function LabDefs() {
  return (
    <>
      <GlassMetalDefs />
      <SceneDefs />
    </>
  );
}

function GlassMetalDefs() {
  return (
    <defs>
      <linearGradient id="lab-glass" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="0.18" stopColor="#ffffff" stopOpacity="0.15" />
        <stop offset="0.7" stopColor="#dbeafe" stopOpacity="0.12" />
        <stop offset="1" stopColor="#94a3b8" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="lab-shine" x1="0" x2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.85" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="lab-metal" x1="0" x2="1">
        <stop offset="0" stopColor="#6b7280" />
        <stop offset="0.35" stopColor="#e5e7eb" />
        <stop offset="0.6" stopColor="#9ca3af" />
        <stop offset="1" stopColor="#4b5563" />
      </linearGradient>
      <linearGradient id="lab-metal-v" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#f3f4f6" />
        <stop offset="0.5" stopColor="#9ca3af" />
        <stop offset="1" stopColor="#4b5563" />
      </linearGradient>
    </defs>
  );
}

function SceneDefs() {
  return (
    <defs>
      <linearGradient id="lab-latex" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.55" stopColor="#f4f6f9" />
        <stop offset="1" stopColor="#d9e0e8" />
      </linearGradient>
      <linearGradient id="lab-body" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#f8fafc" />
        <stop offset="1" stopColor="#cbd5e1" />
      </linearGradient>
      <radialGradient id="lab-heat" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff7ed" />
        <stop offset="0.35" stopColor="#fb923c" />
        <stop offset="1" stopColor="#b91c1c" />
      </radialGradient>
      <linearGradient id="lab-wall" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#eaf2ff" />
        <stop offset="1" stopColor="#d6e4f7" />
      </linearGradient>
      <linearGradient id="lab-bench" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#5b6878" />
        <stop offset="0.12" stopColor="#3e4a59" />
        <stop offset="1" stopColor="#2a333f" />
      </linearGradient>
      <linearGradient id="lab-rubber" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#b45f3c" />
        <stop offset="1" stopColor="#6b2f1a" />
      </linearGradient>
      <filter id="lab-shadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.25" />
      </filter>
      <filter id="lab-blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  );
}

/** 타일 벽 + 실험대(검은 상판). 장면 맨 뒤에 깐다 */
export function Bench() {
  const tiles = Array.from({ length: 13 }, (_, i) => i * 40);
  return (
    <g aria-hidden="true">
      <rect x="0" y="0" width={VIEW_W} height={BENCH_Y} fill="url(#lab-wall)" />
      {tiles.map((x) => <line key={`v${x}`} x1={x} x2={x} y1="0" y2={BENCH_Y} stroke="#c7d6ea" strokeWidth="1" />)}
      {[40, 80, 120, 160, 200, 240].map((y) => <line key={`h${y}`} x1="0" x2={VIEW_W} y1={y} y2={y} stroke="#c7d6ea" strokeWidth="1" />)}
      <rect x="0" y={BENCH_Y} width={VIEW_W} height={VIEW_H - BENCH_Y} fill="url(#lab-bench)" />
      <rect x="0" y={BENCH_Y} width={VIEW_W} height="3" fill="#7b8898" />
    </g>
  );
}

/** 물체 아래 그림자(바닥에 붙는 타원) */
export function FloorShadow({ cx, w, y = BENCH_Y }: { cx: number; w: number; y?: number }) {
  return <ellipse cx={cx} cy={y + 2} rx={w / 2} ry="4" fill="#0f172a" opacity="0.28" aria-hidden="true" />;
}

/** 액체 색 — 조금 진한 아래쪽, 밝은 위쪽 */
export const LIQ: Record<string, { top: string; bottom: string; opacity: number }> = {
  water: { top: "#bfe3ff", bottom: "#5aaef0", opacity: 0.75 },
  hot_water: { top: "#cfe9ff", bottom: "#6bb8f2", opacity: 0.75 },
  ice_water: { top: "#e6f6ff", bottom: "#9fd4f7", opacity: 0.8 },
  ethanol: { top: "#f3efff", bottom: "#c9bdf5", opacity: 0.7 },
  mixture: { top: "#e3e6ff", bottom: "#a6b2f2", opacity: 0.72 },
  oil: { top: "#fff3b0", bottom: "#e8b923", opacity: 0.85 },
  cuso4: { top: "#9fd3ff", bottom: "#1d74d6", opacity: 0.82 },
  cuso4_light: { top: "#d6ecff", bottom: "#6fb2ee", opacity: 0.75 },
  kno3: { top: "#eef7ff", bottom: "#b8daf5", opacity: 0.75 },
  nacl: { top: "#eef7ff", bottom: "#b8daf5", opacity: 0.75 },
  melt: { top: "#fff8d6", bottom: "#f2d873", opacity: 0.85 },
};

/** 액체 그라데이션 정의 (장면 안에서 쓰는 색만) */
export function LiquidDefs({ keys }: { keys: string[] }) {
  return (
    <defs>
      {keys.map((k) => <LiquidGradient key={k} k={k} />)}
    </defs>
  );
}

function LiquidGradient({ k }: { k: string }) {
  const c = LIQ[k] ?? LIQ.water;
  return (
    <linearGradient id={`lab-liq-${k}`} x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor={c.top} stopOpacity={c.opacity} />
      <stop offset="1" stopColor={c.bottom} stopOpacity={Math.min(1, c.opacity + 0.15)} />
    </linearGradient>
  );
}

export const liqFill = (k: string | null | undefined) => `url(#lab-liq-${k && LIQ[k] ? k : "water"})`;
