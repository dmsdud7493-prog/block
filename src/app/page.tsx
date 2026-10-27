import Link from "next/link";
import { CATALOGS, EXPERIMENT_ORDER } from "@/lib/engine/experiments";

function ExperimentLink({ slug }: { slug: string }) {
  const c = CATALOGS[slug];
  if (!c) return null;
  return (
    <li>
      <Link href={`/demo/${slug}`} className="tap block rounded-lg border border-line bg-panel p-3 hover:border-brand">
        <span className="font-bold">{c.title}</span>
        <span className="mt-1 block text-sm text-muted">{c.goal}</span>
      </Link>
    </li>
  );
}

function Entry({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="tap block rounded-xl bg-brand p-4 text-white shadow hover:opacity-95">
      <span className="text-lg font-bold">{title}</span>
      <span className="mt-1 block text-sm opacity-90">{body}</span>
    </Link>
  );
}

export default function Home() {
  return (
    <main id="main" className="mx-auto max-w-5xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold sm:text-3xl">🔬 물질의 특성 가상실험실</h1>
      <p className="mt-2 text-muted">중학교 과학 · 2022 개정 교육과정 (8) 물질의 특성 — 블록으로 실험을 설계하고, 결과를 예상하고, 가상 실험으로 확인해요.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Entry href="/login" title="학생 입장" body="반 코드·번호·PIN으로 들어와 선생님이 내준 실험을 해요." />
        <Entry href="/login?role=teacher" title="교사 입장" body="반을 만들고, 실험을 배정하고, 진행 상황과 보고서를 확인해요." />
      </div>

      <h2 className="mt-8 text-xl font-bold">로그인 없이 체험하기</h2>
      <p className="text-sm text-muted">체험 모드에서는 결과가 저장되지 않고 선생님께 제출되지 않아요.</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXPERIMENT_ORDER.map((slug) => <ExperimentLink key={slug} slug={slug} />)}
      </ul>
    </main>
  );
}
