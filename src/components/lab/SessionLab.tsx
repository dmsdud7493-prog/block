"use client";
/** 저장되는 실제 세션 — 같은 LabShell에 세션 백엔드·튜터·보고서를 연결 */
import { useMemo } from "react";
import LabShell from "./LabShell";
import { sessionBackend } from "./backend";
import type { SessionView } from "./types";
import TutorPanel from "@/components/tutor/TutorPanel";
import ReportView from "@/components/report/ReportView";
import { returnNoteOf } from "@/components/report/ReturnNoteBox";
import type { ReportContent } from "@/lib/report/template";
import { getCatalog } from "@/lib/engine/experiments";
import type { LabController } from "./useLabController";
import HelpBubble from "./HelpBubble";
import StatusWatch from "./StatusWatch";

type Editing = "none" | "slots" | "all";

export default function SessionLab({ view, author }: { view: SessionView; author?: string }) {
  const backend = useMemo(() => sessionBackend(view.sessionId), [view.sessionId]);
  const catalog = getCatalog(view.slug);
  if (!catalog) return null;
  const editing = (view.classSettings.hint_level_editing as Editing) ?? "slots";
  const atReport = ["submitted", "resubmitted", "returned"].includes(view.status);
  const tutor = (ctl: LabController, section: string | null) => <TutorPanel ctl={ctl} catalog={catalog} mode="session" sessionId={view.sessionId} initial={view.chat} hintLevelEditing={editing} reportSection={section} />;
  const saved = view.report ? { content: view.report.content as Partial<ReportContent>, aiAssisted: view.report.aiAssisted } : null;
  const report = (ctl: LabController, back: () => void) => <ReportView ctl={ctl} catalog={catalog} author={author} mode="session" sessionId={view.sessionId} saved={saved} status={view.status} returnNote={returnNoteOf(view)} onBack={back} tutor={(section) => tutor(ctl, section)} />;
  return (
    <>
    <HelpBubble sessionId={view.sessionId} active={view.status === "in_progress" || view.status === "returned"} />
    <StatusWatch sessionId={view.sessionId} status={view.status} returnedAt={view.submission?.returned_at ?? null} />
    <LabShell
      slug={view.slug}
      backend={backend}
      hydrate={{ ...view.hydrate, ...(atReport ? { phase: "report" as const } : {}) }}
      initialBlockly={view.blockly}
      settings={{ hintLevelEditing: editing, fixedAmounts: view.classSettings.fixed_amounts === true }}
      tutor={(ctl) => tutor(ctl, null)}
      report={report}
    />
    </>
  );
}
