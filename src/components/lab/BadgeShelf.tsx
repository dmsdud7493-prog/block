/**
 * 과학자 배지 진열장 — 미션을 모두 마치고 보고서를 낸 실험은 그 실험의 과학자 배지가 색깔로 켜진다 (2026-11-18 사용자 요청).
 * 아직 안 한 실험은 흐린 얼굴로 보여 "모아 보고 싶게" 한다(자기 배지만 보여 준다).
 */
import ScientistFace from "@/components/ui/ScientistFace";
import { scientistOf } from "@/components/ui/scientists";
import type { AssignmentItem } from "./AssignmentList";

const EARNED = new Set(["submitted", "resubmitted", "returned", "graded"]);

function Badge({ a }: { a: AssignmentItem }) {
  const s = scientistOf(a.slug);
  if (!s) return null;
  const got = EARNED.has(a.status ?? "");
  return (
    <li className="flex w-24 flex-col items-center text-center" title={got ? s.story : `${a.title}을(를) 마치면 받을 수 있어요`}>
      <span className={`rounded-full p-1 ${got ? "bg-sun/30 ring-2 ring-sun" : "bg-slate-100"}`}><ScientistFace look={s.look} happy={got} size={60} gray={!got} /></span>
      <span className={`mt-1 text-xs font-bold ${got ? "text-nav" : "text-muted"}`}>{got ? `🏅 ${s.name}` : "？"}</span>
      <span className="sr-only">{got ? `${s.name} 배지를 모았어요. ${s.story}` : `${a.title} 배지는 아직이에요`}</span>
    </li>
  );
}

export default function BadgeShelf({ items }: { items: AssignmentItem[] }) {
  const shown = items.filter((a) => scientistOf(a.slug));
  if (shown.length === 0) return null;
  const got = shown.filter((a) => EARNED.has(a.status ?? "")).length;
  return (
    <section aria-labelledby="badge-title" className="mt-4 rounded-2xl bg-panel p-3 shadow-sm">
      <h2 id="badge-title" className="font-display text-lg text-nav">🏅 과학자 배지 진열장 <span className="font-sans text-sm text-muted">{got}/{shown.length}</span></h2>
      <ul className="mt-2 flex flex-wrap gap-2">{shown.map((a) => <Badge key={a.id} a={a} />)}</ul>
    </section>
  );
}
