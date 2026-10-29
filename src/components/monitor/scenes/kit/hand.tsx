"use client";
/**
 * 실험용 장갑을 낀 손 — 행동하는 단계에만 위에서 들어와 동작하고 빠진다(lab-hand).
 * 손목이 위, 손끝이 아래. (0,0)은 손이 무언가를 잡는 점(grip)·집는 점(pinch)·누르는 점(point).
 * 흰 실험복 소매가 화면 위로 이어진다. 장갑은 안전 습관(실험할 땐 장갑)도 함께 보여 준다.
 */

const GLOVE = "#8db7f5";
const GLOVE_DARK = "#4f7fcf";
const CUFF = "#b9d3fb";

function Sleeve({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 13} ${y} L${x - 16} ${y - 120} L${x + 16} ${y - 120} L${x + 13} ${y} Z`} fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
      <rect x={x - 14} y={y - 6} width="28" height="9" rx="3" fill={CUFF} stroke={GLOVE_DARK} strokeWidth="1" />
    </g>
  );
}

/** 물건을 감싸 쥔 손 — 손가락이 물건 앞쪽으로 감긴다 */
function Grip() {
  return (
    <g>
      <Sleeve x={0} y={-30} />
      <path d="M-13 -28 Q-17 -10 -12 2 L12 2 Q17 -10 13 -28 Z" fill={GLOVE} stroke={GLOVE_DARK} strokeWidth="1.2" />
      {[-9, -3, 3, 9].map((fx) => <rect key={fx} x={fx - 3} y="-4" width="6.5" height="13" rx="3.2" fill={GLOVE} stroke={GLOVE_DARK} strokeWidth="1" />)}
      <path d="M-13 -16 Q-22 -6 -15 4" fill="none" stroke={GLOVE_DARK} strokeWidth="6" strokeLinecap="round" />
      <path d="M-13 -16 Q-22 -6 -15 4" fill="none" stroke={GLOVE} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

/** 엄지와 검지로 집는 손 (핀셋을 쥘 때) */
function Pinch() {
  return (
    <g>
      <Sleeve x={6} y={-40} />
      <path d="M-6 -38 Q-10 -24 -4 -14 L16 -14 Q20 -26 18 -38 Z" fill={GLOVE} stroke={GLOVE_DARK} strokeWidth="1.2" />
      <path d="M-2 -16 L-3 -2" stroke={GLOVE_DARK} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M-2 -16 L-3 -2" stroke={GLOVE} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M12 -16 L4 -3" stroke={GLOVE_DARK} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M12 -16 L4 -3" stroke={GLOVE} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M17 -18 Q20 -12 17 -8" fill="none" stroke={GLOVE_DARK} strokeWidth="1" />
    </g>
  );
}

/** 검지로 단추를 누르는 손 */
function Point() {
  return (
    <g>
      <Sleeve x={10} y={-34} />
      <path d="M-2 -32 Q-6 -20 0 -12 L20 -12 Q24 -22 22 -32 Z" fill={GLOVE} stroke={GLOVE_DARK} strokeWidth="1.2" />
      <path d="M2 -14 L0 -2" stroke={GLOVE_DARK} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M2 -14 L0 -2" stroke={GLOVE} strokeWidth="4.5" strokeLinecap="round" />
      {[8, 14, 19].map((fx) => <rect key={fx} x={fx - 3} y="-15" width="6" height="8" rx="3" fill={GLOVE} stroke={GLOVE_DARK} strokeWidth="1" />)}
    </g>
  );
}

const POSE = { grip: Grip, pinch: Pinch, point: Point } as const;

/**
 * 손 — (x,y)에서 pose 모양으로, rotate도만큼 기울여 그린다. children은 손이 들고 있는 물건(손보다 먼저 그려 손가락이 앞에 온다).
 * key를 단계마다 바꿔 주면 단계마다 다시 들어오는 움직임이 나온다.
 */
export function Hand({ x, y, pose, rotate = 0, children }: { x: number; y: number; pose: keyof typeof POSE; rotate?: number; children?: React.ReactNode }) {
  const Pose = POSE[pose];
  return (
    <g transform={`translate(${x},${y}) rotate(${rotate})`} aria-hidden="true">
      <g className="lab-hand">
        {children}
        <g transform="scale(1.4)"><Pose /></g>
      </g>
    </g>
  );
}

/** 핀셋 — 손이 쥐는 끝(0,0)에서 아래로 len, 끝에 tip(집은 물건)을 단다 */
export function Tweezers({ len = 44, tip }: { len?: number; tip?: React.ReactNode }) {
  return (
    <g>
      <path d={`M-2 -10 L-1.2 ${len}`} stroke="url(#lab-metal)" strokeWidth="2.4" strokeLinecap="round" />
      <path d={`M3 -10 L1.2 ${len}`} stroke="url(#lab-metal)" strokeWidth="2.4" strokeLinecap="round" />
      <g transform={`translate(0,${len})`}>{tip}</g>
    </g>
  );
}
