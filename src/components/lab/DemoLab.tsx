"use client";
/** 체험 모드 — 로그인·저장 없이 같은 실험 화면을 쓴다 (ADR-P06) */
import { useMemo, useState } from "react";
import LabShell from "./LabShell";
import { demoBackend } from "./backend";
import TutorPanel from "@/components/tutor/TutorPanel";
import ReportView from "@/components/report/ReportView";
import { getCatalog } from "@/lib/engine/experiments";
import type { LabController } from "./useLabController";

function newSeed(slug: string): string {
  const key = `demo-seed:${slug}`;
  try {
    const saved = window.sessionStorage.getItem(key);
    if (saved) return saved;
    const fresh = `demo-${crypto.randomUUID()}`;
    window.sessionStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return `demo-${Math.random().toString(36).slice(2)}`;
  }
}

/** 체험 모드에서 Claude를 쓰지 않을 때 대화 맨 앞에 보이는 안내 */
export const DEMO_LOCAL_NOTICE = "📢 체험 모드에서는 AI(Claude) 대신 미리 정해 둔 '기본 도우미'가 답해요. 낱말 뜻이나 다음에 할 일 정도만 도와줄 수 있어요. 로그인해서 수업 실험을 하면 AI 도우미와 더 자세히 이야기할 수 있어요.";

export default function DemoLab({ slug, aiTutor = false }: { slug: string; aiTutor?: boolean }) {
  const [seed] = useState(() => (typeof window === "undefined" ? "demo-ssr" : newSeed(slug)));
  const backend = useMemo(() => demoBackend(slug, seed), [slug, seed]);
  const catalog = getCatalog(slug);
  if (!catalog) return null;
  const tutor = (ctl: LabController, section: string | null = null) => <TutorPanel ctl={ctl} catalog={catalog} mode="demo" seed={seed} reportSection={section} notice={aiTutor ? undefined : DEMO_LOCAL_NOTICE} />;
  const report = (ctl: LabController, back: () => void) => <ReportView ctl={ctl} catalog={catalog} mode="demo" saved={null} status="in_progress" onBack={back} tutor={(section) => tutor(ctl, section)} />;
  return <LabShell slug={slug} backend={backend} badge="체험 모드 · 저장되지 않아요" tutor={(ctl) => tutor(ctl)} report={report} />;
}
