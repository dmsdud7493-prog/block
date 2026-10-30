"use client";
/**
 * 오늘의 미션 카드 — 무엇을 알아낼지만 보여 준다(순서는 학생이 블록으로, 규칙 6).
 * 마친 미션 ✅, 지금 할 미션 👉, 다음 미션 🔒(앞 미션을 마치면 차례가 와요). 색만으로 구분하지 않도록 글자로도 상태를 적는다.
 */
import type { MissionProgress } from "@/components/lab/missions";

const NUM = ["①", "②", "③", "④", "⑤", "⑥"];

function Row({ n, icon, title, state }: { n: number; icon: string; title: string; state: "done" | "now" | "locked" }) {
  const tone = state === "done" ? "text-ok" : state === "now" ? "font-extrabold text-nav" : "text-muted";
  const mark = state === "done" ? "✅" : state === "now" ? "👉" : "🔒";
  const word = state === "done" ? "완료" : state === "now" ? "지금 할 미션" : "앞 미션을 마치면 차례";
  return (
    <li className={`flex items-start gap-1.5 ${tone}`}>
      <span aria-hidden="true">{mark}</span>
      <span className="min-w-0">{NUM[n] ?? `${n + 1}.`} <span aria-hidden="true">{icon}</span> {title}<span className="sr-only"> ({word})</span></span>
    </li>
  );
}

export default function MissionBar({ progress }: { progress: MissionProgress }) {
  const { missions, done, current } = progress;
  if (missions.length === 0) return null;
  const all = current >= missions.length;
  return (
    <section aria-label="오늘의 미션" className="rounded-lg border-2 border-sun bg-[#fffbea] px-3 py-2 text-sm shadow-sm">
      <h3 className="flex items-center gap-2 font-extrabold text-nav">
        🎯 오늘의 미션
        <span className="ml-auto rounded-full bg-white px-2 text-xs font-bold text-muted">{done.filter(Boolean).length}/{missions.length}</span>
      </h3>
      <ol className="mt-1 space-y-0.5">
        {missions.map((m, i) => <Row key={m.id} n={i} icon={m.icon} title={m.title} state={done[i] ? "done" : i === current ? "now" : "locked"} />)}
      </ol>
      {all ? <p className="mt-1 font-bold text-ok">🏆 미션을 모두 마쳤어요! 결과 해석과 보고서로 정리해 봐요.</p> : null}
    </section>
  );
}
