"use client";
/**
 * 미션 진행 = 과학자 짝꿍 옆 비커가 차오른다 (2026-11-18 사용자 요청: 배지 모으기 + 차오르는 진행 막대).
 * - 미션을 하나 마칠 때마다 비커 눈금 하나만큼 액체가 차오르고 방울이 퐁퐁 올라온다(얼굴은 웃는 눈).
 * - 모두 마치면 비커가 보글보글 넘치고 "보고서를 내면 배지가 진열장에 들어가요!" — 배지는 보고서를 제출해야
 *   실험 목록의 배지 진열장에 켜진다(BadgeShelf). 배지를 보고서 제출의 동기로 쓴다(2026-11-20 사용자 결정).
 * 움직임 줄이기 설정이면 애니메이션 없이 높이만 바뀐다(globals.css). 바뀐 내용은 화면 읽기 프로그램에 알린다.
 */
import { useEffect, useRef, useState } from "react";
import ScientistFace from "@/components/ui/ScientistFace";
import { scientistOf, type Scientist } from "@/components/ui/scientists";

const TOP = 22;
const BOTTOM = 92;

function Bubbles({ color, many }: { color: string; many: boolean }) {
  const xs = many ? [30, 40, 50, 60, 70, 36, 64] : [38, 52, 64];
  return <g fill={color} opacity=".85">{xs.map((x, i) => <circle key={`${x}-${i}`} className="lab-rise" style={{ animationDelay: `${i * 0.18}s` }} cx={x} cy={BOTTOM - 6} r={many ? 3.4 : 2.6} />)}</g>;
}

function Foam({ color }: { color: string }) {
  return <g className="lab-foam" fill={color}>{[28, 38, 48, 58, 68].map((x) => <circle key={x} cx={x} cy={TOP - 2} r="7" />)}<circle cx="74" cy={TOP + 8} r="4" /><circle cx="76" cy={TOP + 20} r="3" /></g>;
}

/** 비커 — 미션 수만큼 눈금, done만큼 액체 */
function Beaker({ s, done, total, burst, full, size }: { s: Scientist; done: number; total: number; burst: boolean; full: boolean; size: number }) {
  const level = BOTTOM - ((BOTTOM - TOP) * done) / Math.max(1, total);
  const ticks = Array.from({ length: total }, (_, i) => BOTTOM - ((BOTTOM - TOP) * (i + 1)) / total);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="overflow-visible">
      <defs><clipPath id={`beaker-${s.look}`}><path d="M24 14 L24 88 Q24 94 30 94 L70 94 Q76 94 76 88 L76 14 Z" /></clipPath></defs>
      <g clipPath={`url(#beaker-${s.look})`}>
        <rect className="lab-fill" x="20" y={level} width="60" height={BOTTOM + 4 - level} fill={s.liquid} opacity=".8" />
        {burst || full ? <Bubbles color="#fff" many={full} /> : null}
      </g>
      {full ? <Foam color={s.liquid} /> : null}
      <path d="M20 12 L24 14 L24 88 Q24 94 30 94 L70 94 Q76 94 76 88 L76 14 L80 12" fill="none" stroke="#475569" strokeWidth="3" strokeLinejoin="round" />
      <g stroke="#94a3b8" strokeWidth="2">{ticks.map((y) => <line key={y} x1="24" x2="34" y1={y} y2={y} />)}</g>
    </svg>
  );
}

/** 미션 수가 늘면 잠깐(2.4초) 축하 상태 — 처음 화면을 열 때는 축하하지 않는다 */
function useBurst(done: number): boolean {
  const prev = useRef(done);
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (done <= prev.current) {
      prev.current = done;
      return undefined;
    }
    prev.current = done;
    setBurst(true);
    const t = setTimeout(() => setBurst(false), 2400);
    return () => clearTimeout(t);
  }, [done]);
  return burst;
}

export default function ScientistBeaker({ slug, done, total, size = 76 }: { slug: string; done: number; total: number; size?: number }) {
  const s = scientistOf(slug);
  const burst = useBurst(done);
  if (!s || total === 0) return null;
  const full = done >= total;
  const say = full ? `미션을 모두 마쳐 비커가 가득 찼어요. 보고서를 내면 ${s.name} 배지가 진열장에 들어가요.` : burst ? `미션 ${done} 성공! 비커가 차올랐어요.` : null;
  return (
    <figure className={`relative flex shrink-0 flex-col items-center ${burst ? "pop-in" : ""}`}>
      <div className="flex items-end" role="img" aria-label={`과학자 짝꿍 ${s.name}과 비커: 미션 ${total}개 중 ${done}개를 마쳐 비커가 ${full ? "가득 찼어요" : "차오르는 중이에요"}`}>
        <ScientistFace look={s.look} happy={burst || full} size={size} />
        <Beaker s={s} done={done} total={total} burst={burst} full={full} size={size} />
      </div>
      <figcaption className="text-[11px] font-bold leading-tight text-nav">{s.name}</figcaption>
      {say ? <p aria-hidden="true" className={`mt-0.5 bg-sun px-2 text-xs font-extrabold leading-tight text-nav ${full ? "max-w-[10rem] rounded-xl py-0.5 text-center" : "whitespace-nowrap rounded-full"}`}>{full ? "🏅 보고서를 내면 배지가 진열장에 들어가요!" : `🎉 미션 ${done} 성공!`}</p> : null}
      <span className="sr-only" aria-live="polite">{say ?? ""}</span>
    </figure>
  );
}
