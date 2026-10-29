import Link from "next/link";
import { CATALOGS, EXPERIMENT_ORDER } from "@/lib/engine/experiments";
import { MISSION } from "@/components/ui/missions";

const FLOW = [["🧩", "설계"], ["🔮", "예측"], ["🧪", "실험"], ["📈", "해석"], ["📝", "보고서"]] as const;

function MissionTitle({ icon, chip, index, title }: { icon: string; chip: string; index: number; title: string }) {
  return (
    <span className="flex items-center gap-3">
      <span aria-hidden="true" className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)] ${chip}`}>{icon}</span>
      <span className="min-w-0"><span className="block text-xs font-bold text-muted">미션 {index + 1}</span><span className="block font-display text-xl text-nav">{title}</span></span>
    </span>
  );
}

function MissionCard({ slug, index }: { slug: string; index: number }) {
  const c = CATALOGS[slug];
  const m = MISSION[slug];
  if (!c || !m) return null;
  return (
    <li>
      <Link href={`/demo/${slug}`} className={`lift tap group flex h-full flex-col rounded-2xl border-t-[6px] bg-panel p-4 shadow-sm ${m.tone}`}>
        <MissionTitle icon={m.icon} chip={m.chip} index={index} title={c.title} />
        <span className="mt-3 block text-base font-bold text-ink">“{m.hook}”</span>
        <span className="mt-1 block flex-1 text-sm text-muted">{c.goal}</span>
        <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-nav px-3 py-1.5 text-sm font-bold text-white group-hover:bg-nav-2">실험해 보기 ▶</span>
      </Link>
    </li>
  );
}

function HeroIntro() {
  return (
    <div className="flex-1">
      <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-[#cbd5e1]">중학교 과학 · (8) 물질의 특성</p>
      <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">🔬 물질의 특성<br />가상실험실</h1>
      <p className="mt-3 max-w-xl text-[#d6e4f0]">블록을 끼워 실험 순서를 조립하고, 결과를 먼저 예상한 다음, 가상 실험으로 직접 확인해 봐요. 실험 도구가 깨질 걱정은 없어요!</p>
      <p className="mt-6 flex flex-wrap gap-3">
        <Link href="/login" className="tap btn-sun inline-flex items-center px-7 text-lg">🎒 학생 입장</Link>
        <Link href="/login?role=teacher" className="tap inline-flex items-center rounded-full border-2 border-white/60 px-6 font-bold text-white hover:bg-white/10">🧑‍🏫 교사 입장</Link>
      </p>
    </div>
  );
}

function FlowStrip() {
  return (
    <ol aria-label="실험 진행 순서" className="grid grid-cols-5 gap-2 text-center text-sm font-bold md:w-[380px]">
      {FLOW.map(([icon, label], n) => <li key={label} className="float-y rounded-2xl bg-white/10 px-1 py-3" style={{ animationDelay: `${n * 0.25}s` }}><span aria-hidden="true" className="block text-2xl">{icon}</span>{label}</li>)}
    </ol>
  );
}

function Hero() {
  return (
    <section className="bg-nav text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-8 md:flex-row md:items-center"><HeroIntro /><FlowStrip /></div>
    </section>
  );
}

function Missions() {
  return <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{EXPERIMENT_ORDER.map((slug, i) => <MissionCard key={slug} slug={slug} index={i} />)}</ul>;
}

export default function Home() {
  return (
    <>
      <Hero />
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <h2 className="font-display text-2xl text-nav">🚀 로그인 없이 먼저 해 보기</h2>
        <p className="text-sm text-muted">체험 모드에서는 결과가 저장되지 않고 선생님께 제출되지 않아요.</p>
        <Missions />
        <footer className="mt-10 flex gap-4 border-t border-line pt-3 text-sm"><Link className="underline" href="/privacy">개인정보 처리방침</Link><Link className="underline" href="/netcheck">학교 망 점검</Link></footer>
      </main>
    </>
  );
}
