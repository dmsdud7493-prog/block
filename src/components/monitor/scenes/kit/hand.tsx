"use client";
/**
 * 흰 라텍스 장갑을 낀 손 — 팔·소매 없이 손목의 장갑 끝단까지만 그린다.
 * 행동하는 단계에만 위에서 들어와 동작하고 빠진다(lab-hand).
 * (0,0)은 손이 물건을 잡는 점(grip)·핀셋을 집는 점(pinch)·단추를 누르는 손끝(point).
 * 손가락은 둥근 끝을 가진 곡선(마디 주름·반사광 포함)으로 그려 자연스럽게 보이게 한다.
 */

const EDGE = "#a9b5c3";
const CREASE = "#c9d2dc";

/** 손가락 한 개 — 장갑 윤곽선 + 라텍스 면 + 위쪽 반사광, crease는 마디 주름 선 */
function Finger({ d, w, crease }: { d: string; w: number; crease?: string }) {
  return (
    <g>
      <path d={d} fill="none" stroke={EDGE} strokeWidth={w + 1.6} strokeLinecap="round" />
      <path d={d} fill="none" stroke="url(#lab-latex)" strokeWidth={w} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#ffffff" strokeWidth={w * 0.28} strokeLinecap="round" opacity="0.85" transform="translate(-0.6,-0.9)" />
      {crease ? <path d={crease} fill="none" stroke={CREASE} strokeWidth="0.9" strokeLinecap="round" /> : null}
    </g>
  );
}

/** 손바닥·손등과 장갑 끝단(말린 테두리) */
function Palm({ d, cuff, rim }: { d: string; cuff: string; rim: string }) {
  return (
    <g>
      <path d={cuff} fill="url(#lab-latex)" stroke={EDGE} strokeWidth="1.1" strokeLinejoin="round" />
      <path d={rim} fill="none" stroke={EDGE} strokeWidth="1.6" strokeLinecap="round" />
      <path d={d} fill="url(#lab-latex)" stroke={EDGE} strokeWidth="1.1" strokeLinejoin="round" />
    </g>
  );
}

/** 물건 옆을 감싸 쥔 손 — 손은 오른쪽, 손가락이 물건 앞쪽으로 감긴다 */
function Grip() {
  return (
    <g>
      <Palm d="M31 -16 C20 -19 10 -16 4 -11 C1 -4 1 5 4 11 C11 16 22 16 31 13 Z" cuff="M30 -17 L44 -15 Q47 -1 44 13 L30 14 Z" rim="M44 -15 Q47 -1 44 13" />
      <Finger d="M14 -14 C8 -20 0 -20 -6 -17" w={6.8} crease="M3 -21 Q4 -18 3 -15" />
      <Finger d="M8 -9 C0 -11 -9 -10 -15 -7" w={6.2} crease="M-4 -13 Q-3 -10 -4 -7" />
      <Finger d="M8 -3 C-1 -4 -10 -3 -16 -1" w={6.2} crease="M-5 -7 Q-4 -4 -5 -1" />
      <Finger d="M8 3 C0 2 -8 3 -14 5" w={6} crease="M-4 0 Q-3 3 -4 6" />
      <Finger d="M7 8.5 C2 8.5 -4 9 -9 10.5" w={5.2} />
    </g>
  );
}

/** 엄지와 검지로 핀셋을 집은 손 — 손은 위, 손끝이 아래 */
function Pinch() {
  return (
    <g>
      <Finger d="M20 -28 C24 -23 23 -17 19 -14" w={5.4} />
      <Finger d="M16 -24 C19 -18 18 -12 14 -9" w={5.8} />
      <Palm d="M12 -46 C2 -44 -8 -38 -9 -28 C-9 -20 -4 -15 2 -14 C10 -14 18 -20 22 -30 C24 -38 20 -44 12 -46 Z" cuff="M8 -46 L20 -60 L34 -50 L23 -38 Z" rim="M20 -60 L34 -50" />
      <Finger d="M10 -22 C10 -14 7 -8 3 -2" w={6} crease="M5 -13 Q8 -12 11 -13" />
      <Finger d="M-6 -26 C-8 -18 -6 -10 -3 -3" w={6.6} crease="M-9 -16 Q-6 -15 -3 -16" />
    </g>
  );
}

/** 검지를 펴서 단추를 누르는 손 — 나머지 손가락은 말아 쥔다 */
function Point() {
  return (
    <g>
      <Palm d="M8 -46 C-2 -44 -6 -36 -5 -28 C-4 -21 2 -17 9 -17 C17 -17 24 -22 26 -30 C27 -39 20 -46 8 -46 Z" cuff="M4 -46 L16 -60 L32 -52 L22 -40 Z" rim="M16 -60 L32 -52" />
      <Finger d="M19 -24 C21 -19 24 -19 25 -22" w={5.4} />
      <Finger d="M13 -21 C15 -16 19 -15 21 -18" w={5.6} />
      <Finger d="M7 -20 C9 -15 13 -14 15 -17" w={5.8} />
      <Finger d="M-4 -30 C-6 -24 -3 -19 3 -18" w={6.2} />
      <Finger d="M3 -22 C2 -14 1 -7 0 -1" w={6} crease="M-2 -11 Q1 -10 4 -11" />
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
      <g className="lab-hand" filter="url(#lab-shadow)">
        {children}
        <g transform="scale(1.25)"><Pose /></g>
      </g>
    </g>
  );
}

/** 핀셋 — 손이 쥐는 끝(0,0)에서 아래로 len, 끝에 tip(집은 물건)을 단다 */
export function Tweezers({ len = 44, tip }: { len?: number; tip?: React.ReactNode }) {
  return (
    <g>
      <path d={`M-2.5 -14 L-1.2 ${len}`} stroke="url(#lab-metal)" strokeWidth="2.4" strokeLinecap="round" />
      <path d={`M3.5 -14 L1.2 ${len}`} stroke="url(#lab-metal)" strokeWidth="2.4" strokeLinecap="round" />
      <g transform={`translate(0,${len})`}>{tip}</g>
    </g>
  );
}
