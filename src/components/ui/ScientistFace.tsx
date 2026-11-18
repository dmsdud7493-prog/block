/**
 * 과학자 얼굴 캐릭터(단순한 그림) — 머리 모양·수염·소품만 다르게 그린다. viewBox 0 0 100 100.
 * happy: 미션을 마치면 눈이 웃는 모양(^ ^)이 된다.
 */
import type { Scientist } from "./scientists";

const SKIN = "#fcd9b8";
const INK = "#1f2937";

function Eyes({ happy }: { happy: boolean }) {
  if (happy) return <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round"><path d="M36 50 q5 -6 10 0" /><path d="M54 50 q5 -6 10 0" /></g>;
  return <g fill={INK}><circle cx="41" cy="50" r="3.6" /><circle cx="59" cy="50" r="3.6" /><circle cx="42.2" cy="48.8" r="1.1" fill="#fff" /><circle cx="60.2" cy="48.8" r="1.1" fill="#fff" /></g>;
}

function Mouth({ happy }: { happy: boolean }) {
  return happy
    ? <path d="M40 62 q10 12 20 0 z" fill="#e11d48" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    : <path d="M42 63 q8 6 16 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />;
}

/** 얼굴 뒤(머리카락 뒤쪽·모자) */
function Back({ look }: { look: Scientist["look"] }) {
  switch (look) {
    case "archimedes": return <circle cx="50" cy="50" r="33" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5" />;
    case "black": return <g fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1.5"><circle cx="22" cy="52" r="10" /><circle cx="78" cy="52" r="10" /><circle cx="24" cy="68" r="9" /><circle cx="76" cy="68" r="9" /></g>;
    case "celsius": return <g fill="#92400e"><rect x="20" y="40" width="60" height="34" rx="14" /><circle cx="50" cy="78" r="7" fill="#1e3a8a" /></g>;
    case "maria": return <path d="M14 58 Q14 14 50 14 Q86 14 86 58 L86 88 L14 88 Z" fill="#7c3aed" />;
    case "curie": return <circle cx="50" cy="18" r="11" fill="#3f3f46" />;
    default: return null;
  }
}

/** 얼굴 앞(앞머리·수염·소품) */
function Front({ look }: { look: Scientist["look"] }) {
  switch (look) {
    case "archimedes": return <g><path d="M30 62 Q50 96 70 62 Q62 74 50 74 Q38 74 30 62 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.2" /><path d="M24 30 Q50 6 76 30" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" /><g fill="#22c55e"><ellipse cx="30" cy="27" rx="5" ry="3" /><ellipse cx="42" cy="20" rx="5" ry="3" /><ellipse cx="58" cy="20" rx="5" ry="3" /><ellipse cx="70" cy="27" rx="5" ry="3" /></g></g>;
    case "gaylussac": return <g fill="#44403c"><path d="M26 40 Q30 18 50 18 Q72 18 74 40 Q64 28 50 30 Q36 28 26 40 Z" /><rect x="25" y="44" width="6" height="18" rx="3" /><rect x="69" y="44" width="6" height="18" rx="3" /><path d="M40 82 L50 76 L60 82 L50 86 Z" fill="#dc2626" /></g>;
    case "black": return <path d="M28 38 Q34 18 50 18 Q66 18 72 38 Q60 28 50 30 Q40 28 28 38 Z" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1.5" />;
    case "celsius": return <g><path d="M27 40 Q32 20 50 20 Q68 20 73 40 Q60 30 50 31 Q40 30 27 40 Z" fill="#92400e" /><rect x="70" y="58" width="5" height="18" rx="2.5" fill="#fff" stroke={INK} strokeWidth="1.2" /><circle cx="72.5" cy="77" r="3.6" fill="#ef4444" /></g>;
    case "maria": return <g><path d="M30 34 Q50 22 70 34" fill="none" stroke="#5b21b6" strokeWidth="4" /><circle cx="27" cy="62" r="3" fill="#fbbf24" /><circle cx="73" cy="62" r="3" fill="#fbbf24" /></g>;
    case "curie": return <g><path d="M26 44 Q28 22 50 22 Q72 22 74 44 Q66 32 50 33 Q34 32 26 44 Z" fill="#3f3f46" /><path d="M36 84 L50 92 L64 84" fill="none" stroke="#111827" strokeWidth="5" /></g>;
    default: return null;
  }
}

export default function ScientistFace({ look, happy = false, size = 64, gray = false }: { look: Scientist["look"]; happy?: boolean; size?: number; gray?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className={gray ? "opacity-40 grayscale" : undefined}>
      <Back look={look} />
      <circle cx="50" cy="54" r="26" fill={SKIN} stroke="#e7b48a" strokeWidth="1.5" />
      <circle cx="33" cy="60" r="4" fill="#fda4af" opacity=".7" />
      <circle cx="67" cy="60" r="4" fill="#fda4af" opacity=".7" />
      <Eyes happy={happy} />
      <Mouth happy={happy} />
      <Front look={look} />
    </svg>
  );
}
