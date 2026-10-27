"use client";
/**
 * 곡선 예측 그리기 (지침 3.1, plan S8) — 시간–온도 그래프를 결과 전에 직접 그려 본다(선택).
 * - 터치/마우스: 그래프 위를 누르거나 끌면 가장 가까운 시점의 점이 그 높이로 옮겨진다. 점마다 반지름 25px 이상 누름 영역.
 * - 키보드 대안: "숫자로 입력하기"에서 시점마다 온도를 적는다 (KWCAG 2.1.1).
 * 맞고 틀림을 매기지 않는다 — 결과 그래프 위에 "내 예상"으로 겹쳐 보여 줄 뿐이다(지침 3.3).
 */
import { useRef, useState } from "react";
import type { SketchSpec } from "@/lib/engine/experiments/types";

export const HIT_RADIUS = 26;
const W = 320;
const H = 200;
const PAD = { l: 36, r: 10, t: 10, b: 26 };

export type Sketch = (number | null)[];

export const sketchTimes = (spec: SketchSpec) => Array.from({ length: spec.points }, (_, i) => Math.round((spec.xMax * i) / (spec.points - 1)));
const px = (spec: SketchSpec, i: number) => PAD.l + ((W - PAD.l - PAD.r) * i) / (spec.points - 1);
const py = (spec: SketchSpec, v: number) => PAD.t + ((H - PAD.t - PAD.b) * (spec.yMax - v)) / (spec.yMax - spec.yMin);
const clamp = (spec: SketchSpec, v: number) => Math.min(spec.yMax, Math.max(spec.yMin, v));

function toValue(spec: SketchSpec, svg: SVGSVGElement, clientX: number, clientY: number): { i: number; v: number } {
  const box = svg.getBoundingClientRect();
  const x = ((clientX - box.left) / Math.max(1, box.width)) * W;
  const y = ((clientY - box.top) / Math.max(1, box.height)) * H;
  const i = Math.round(((x - PAD.l) / (W - PAD.l - PAD.r)) * (spec.points - 1));
  const v = spec.yMax - ((y - PAD.t) / (H - PAD.t - PAD.b)) * (spec.yMax - spec.yMin);
  return { i: Math.min(spec.points - 1, Math.max(0, i)), v: Math.round(clamp(spec, v)) };
}

function Axes({ spec }: { spec: SketchSpec }) {
  const ticks = [spec.yMin, (spec.yMin + spec.yMax) / 2, spec.yMax];
  return (
    <g fontSize="10" fill="#475569">
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#94a3b8" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#94a3b8" />
      {ticks.map((t) => <text key={t} x={PAD.l - 4} y={py(spec, t) + 3} textAnchor="end">{t}</text>)}
      <text x={W - PAD.r} y={H - 8} textAnchor="end">시간(초) → {spec.xMax}</text>
      <text x={4} y={PAD.t + 8}>℃</text>
    </g>
  );
}

function Points({ spec, sketch }: { spec: SketchSpec; sketch: Sketch }) {
  const pts = sketch.flatMap((v, i) => (v === null ? [] : [{ i, v }]));
  const path = pts.map((p) => `${px(spec, p.i)},${py(spec, p.v)}`).join(" ");
  return (
    <g>
      {pts.length > 1 ? <polyline points={path} fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5 3" /> : null}
      {pts.map((p) => <g key={p.i}><circle cx={px(spec, p.i)} cy={py(spec, p.v)} r={HIT_RADIUS} fill="transparent" data-hit-radius={HIT_RADIUS} /><circle cx={px(spec, p.i)} cy={py(spec, p.v)} r="6" fill="#7c3aed" /></g>)}
    </g>
  );
}

function NumberForm({ spec, sketch, onSet }: { spec: SketchSpec; sketch: Sketch; onSet: (i: number, v: number | null) => void }) {
  return (
    <details className="mt-1 text-sm">
      <summary className="tap cursor-pointer">⌨️ 숫자로 입력하기</summary>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {sketchTimes(spec).map((t, i) => <label key={t} className="text-xs">{t}초의 온도(℃)<input type="number" inputMode="decimal" min={spec.yMin} max={spec.yMax} value={sketch[i] ?? ""} onChange={(e) => onSet(i, e.target.value === "" ? null : clamp(spec, Number(e.target.value)))} className="tap mt-0.5 block w-full rounded border border-line px-1" /></label>)}
      </div>
    </details>
  );
}

export default function SketchPad({ spec, value, onChange }: { spec: SketchSpec; value: Sketch; onChange: (s: Sketch) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState(false);
  const set = (i: number, v: number | null) => onChange(value.map((x, j) => (j === i ? v : x)));
  const at = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const { i, v } = toValue(spec, svgRef.current, e.clientX, e.clientY);
    set(i, v);
  };
  const filled = value.filter((v) => v !== null).length;
  return (
    <fieldset className="mt-3 rounded border border-violet-300 bg-violet-50 p-2">
      <legend className="px-1 text-sm font-semibold">✏️ 그래프로도 그려 볼까요? (선택)</legend>
      <p className="text-xs text-muted">그래프 위를 누르거나 끌어서 시간마다 온도를 찍어요. 결과 그래프에 “내 예상”으로 겹쳐 보여 줘요.</p>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full touch-none select-none rounded bg-white" role="img" aria-label={`예상 그래프 그리기 영역, ${filled}개 점을 찍었어요`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); at(e); }}
        onPointerMove={(e) => { if (drag) at(e); }}
        onPointerUp={() => setDrag(false)} onPointerCancel={() => setDrag(false)}>
        <Axes spec={spec} />
        <Points spec={spec} sketch={value} />
      </svg>
      <div className="flex items-center gap-2"><button type="button" className="tap text-sm underline" onClick={() => onChange(value.map(() => null))}>지우기</button><span className="text-xs text-muted">{filled}/{spec.points}개</span></div>
      <NumberForm spec={spec} sketch={value} onSet={set} />
    </fieldset>
  );
}
