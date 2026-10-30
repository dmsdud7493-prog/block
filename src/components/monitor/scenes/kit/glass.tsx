"use client";
/**
 * 유리 기구 — 비커·시험관·눈금실린더·삼각 플라스크.
 * 액체는 그릇 안쪽 모양으로 잘라(clip) 그리고, 높이가 바뀌면 transform 전환으로 천천히 차오르거나 줄어든다.
 * inside: 그릇 안쪽 좌표계(위 0, 바닥 h)로 그리는 내용(기포·고체·결정) — 그릇 모양 밖으로 나가지 않는다.
 */
import { useId } from "react";
import { liqFill } from "./defs";

export interface VesselProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0~1 */
  level: number;
  liquid?: string | null;
  label?: string;
  inside?: React.ReactNode;
  /** 눈금 글자 (아래→위), 비우면 눈금만 */
  marks?: string[];
  /** 이름표를 그릇 아래가 아니라 왼쪽 옆에(가열 장치 위에 올렸을 때 장치 이름과 겹치지 않게) */
  labelLeft?: boolean;
}

const labelPos = (w: number, h: number, left?: boolean, below = 16) => (left ? { x: -8 - 28, y: h * 0.45 } : { x: w / 2, y: h + below });

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** 액체 — 오목한 수면(메니스커스) + 수면 반사선. 높이 변화는 CSS 전환, 빈 그릇에 처음 담길 때는 바닥부터 차오른다(lab-fill-in) */
function Liquid({ w, h, level, liquid, top = 0 }: { w: number; h: number; level: number; liquid?: string | null; top?: number }) {
  const lv = clamp(level);
  const span = h - top;
  const dy = top + span * (1 - lv);
  if (!liquid || lv <= 0.001) return null;
  return (
    <g className="lab-liquid" style={{ transform: `translateY(${dy}px)`, ["--lab-empty" as string]: `${h + 4}px` }}>
      <path d={`M-2 3 Q${w / 2} 7 ${w + 2} 3 L${w + 2} ${h + 4} L-2 ${h + 4} Z`} fill={liqFill(liquid)} />
      <path d={`M2 3.5 Q${w / 2} 7.5 ${w - 2} 3.5`} fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.5" />
    </g>
  );
}

/** 눈금 — marks[i]는 그릇 용량의 (i+1)/n 높이(액체 높이 계산과 같은 기준). 마지막 칸이 ""면 입구 쪽 눈금만 */
function Marks({ w, h, marks, top = 6 }: { w: number; h: number; marks?: string[]; top?: number }) {
  const n = marks?.length ?? 5;
  const ys = Array.from({ length: n }, (_, i) => h - ((h - top) * (i + 1)) / n).filter((yy) => yy > top + 4);
  return (
    <g aria-hidden="true" opacity="0.75">
      {ys.map((yy) => <line key={yy} x1={w * 0.62} x2={w * 0.86} y1={yy} y2={yy} stroke="#475569" strokeWidth="1" />)}
      {marks ? ys.map((yy, i) => <text key={`t${yy}`} x={w * 0.58} y={yy + 3} textAnchor="end" fontSize="7" fill="#475569">{marks[i]}</text>) : null}
    </g>
  );
}

function Shine({ x1, h }: { x1: number; h: number }) {
  return <rect x={x1} y={6} width="4" height={Math.max(0, h - 16)} rx="2" fill="url(#lab-shine)" opacity="0.7" aria-hidden="true" />;
}

export function Label({ x, y, text }: { x: number; y: number; text?: string }) {
  if (!text) return null;
  const w = Math.max(36, text.length * 10 + 10);
  return (
    <g aria-hidden="true">
      <rect x={x - w / 2} y={y - 11} width={w} height="15" rx="7.5" fill="#ffffff" fillOpacity="0.88" />
      <text x={x} y={y} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1f2d3d">{text}</text>
    </g>
  );
}

/** 비커 — 입구 테두리·따르는 주둥이·눈금 */
export function Beaker({ x, y, w, h, level, liquid, label, inside, marks, labelLeft }: VesselProps) {
  const lp = labelPos(w, h, labelLeft);
  const id = useId();
  const body = `M-4 0 Q0 0 0 5 L0 ${h - 6} Q0 ${h} 6 ${h} L${w - 6} ${h} Q${w} ${h} ${w} ${h - 6} L${w} 3 Q${w} 0 ${w + 2} 0`;
  return (
    <g transform={`translate(${x},${y})`} data-part={label}>
      <clipPath id={id}><path d={`M1 2 L1 ${h - 6} Q1 ${h - 1} 6 ${h - 1} L${w - 6} ${h - 1} Q${w - 1} ${h - 1} ${w - 1} ${h - 6} L${w - 1} 2 Z`} /></clipPath>
      <path d={`${body} Z`} fill="url(#lab-glass)" />
      <g clipPath={`url(#${id})`}>
        <Liquid w={w} h={h} level={level} liquid={liquid} top={6} />
        {inside}
      </g>
      <Marks w={w} h={h} marks={marks} />
      <path d={body} fill="none" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" />
      <Shine x1={5} h={h} />
      <Label x={lp.x} y={lp.y} text={label} />
    </g>
  );
}

/** 시험관 — 둥근 바닥 */
export function TestTube({ x, y, w, h, level, liquid, label, inside }: VesselProps) {
  const id = useId();
  const r = w / 2;
  const body = `M0 0 L0 ${h - r} A${r} ${r} 0 0 0 ${w} ${h - r} L${w} 0`;
  return (
    <g transform={`translate(${x},${y})`} data-part={label}>
      <clipPath id={id}><path d={`M1.5 0 L1.5 ${h - r} A${r - 1.5} ${r - 1.5} 0 0 0 ${w - 1.5} ${h - r} L${w - 1.5} 0 Z`} /></clipPath>
      <path d={`${body} Z`} fill="url(#lab-glass)" />
      <g clipPath={`url(#${id})`}>
        <Liquid w={w} h={h} level={level} liquid={liquid} top={4} />
        {inside}
      </g>
      <path d={body} fill="none" stroke="#64748b" strokeWidth="1.8" />
      <ellipse cx={r} cy="0" rx={r + 1.5} ry="2" fill="none" stroke="#64748b" strokeWidth="1.5" />
      <Shine x1={3} h={h - r} />
      <Label x={r} y={h + 16} text={label} />
    </g>
  );
}

/** 눈금실린더 — 육각 받침, 0~max 눈금 */
export function Cylinder({ x, y, w, h, level, liquid, label, inside, max = 100 }: VesselProps & { max?: number }) {
  const id = useId();
  const ticks = Array.from({ length: 11 }, (_, i) => i);
  const yOf = (i: number) => h - 2 - ((h - 12) * i) / 10;
  return (
    <g transform={`translate(${x},${y})`} data-part={label}>
      <clipPath id={id}><rect x="1.5" y="0" width={w - 3} height={h - 1.5} rx="2" /></clipPath>
      <rect x="0" y="0" width={w} height={h} rx="3" fill="url(#lab-glass)" />
      <g clipPath={`url(#${id})`}>
        <Liquid w={w} h={h} level={level} liquid={liquid} top={10} />
        {inside}
      </g>
      {ticks.map((i) => <line key={i} x1={w - (i % 5 === 0 ? 12 : 7)} x2={w - 1} y1={yOf(i)} y2={yOf(i)} stroke="#334155" strokeWidth={i % 5 === 0 ? 1.2 : 0.8} />)}
      {[0, 5, 10].map((i) => <text key={`n${i}`} x={w - 14} y={yOf(i) + 3} textAnchor="end" fontSize="7" fill="#334155">{(max * i) / 10}</text>)}
      <rect x="0" y="0" width={w} height={h} rx="3" fill="none" stroke="#64748b" strokeWidth="1.8" />
      <path d={`M-3 -2 L${w + 5} -4`} stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <path d={`M-14 ${h} L${w + 14} ${h} L${w + 8} ${h + 7} L-8 ${h + 7} Z`} fill="url(#lab-glass)" stroke="#64748b" strokeWidth="1.5" />
      <Shine x1={4} h={h} />
      <Label x={w / 2} y={h + 22} text={label} />
    </g>
  );
}

/** 삼각 플라스크(가지 달린 것 선택) — 목·몸통·가지 */
export function Flask({ x, y, w, h, level, liquid, label, inside, sideArm = false, labelLeft }: VesselProps & { sideArm?: boolean }) {
  const lp = labelPos(w, h, labelLeft);
  const id = useId();
  const neck = w * 0.24;
  const nx = (w - neck) / 2;
  const sh = h * 0.36;
  const body = `M${nx} 0 L${nx} ${sh} L4 ${h - 6} Q0 ${h} 8 ${h} L${w - 8} ${h} Q${w} ${h} ${w - 4} ${h - 6} L${nx + neck} ${sh} L${nx + neck} 0`;
  return (
    <g transform={`translate(${x},${y})`} data-part={label}>
      <clipPath id={id}><path d={`${body} Z`} /></clipPath>
      <path d={`${body} Z`} fill="url(#lab-glass)" />
      <g clipPath={`url(#${id})`}>
        <Liquid w={w} h={h} level={level} liquid={liquid} top={sh} />
        {inside}
      </g>
      {sideArm ? <path d={`M${nx + neck} ${sh * 0.3} L${w + 26} ${sh * 0.3 + 14}`} stroke="#64748b" strokeWidth="5" strokeLinecap="round" opacity="0.9" /> : null}
      {sideArm ? <path d={`M${nx + neck} ${sh * 0.3} L${w + 26} ${sh * 0.3 + 14}`} stroke="#eef5ff" strokeWidth="2.5" strokeLinecap="round" /> : null}
      <path d={body} fill="none" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" />
      <Shine x1={nx + 3} h={sh + 10} />
      <Label x={lp.x} y={lp.y} text={label} />
    </g>
  );
}
