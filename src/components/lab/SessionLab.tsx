"use client";
/** 저장되는 실제 세션 — 같은 LabShell에 세션 백엔드를 연결 */
import { useMemo } from "react";
import LabShell from "./LabShell";
import { sessionBackend } from "./backend";
import type { SessionView } from "./types";
import TutorPanel from "@/components/tutor/TutorPanel";
import { getCatalog } from "@/lib/engine/experiments";

export default function SessionLab({ view }: { view: SessionView }) {
  const backend = useMemo(() => sessionBackend(view.sessionId), [view.sessionId]);
  const catalog = getCatalog(view.slug);
  return (
    <LabShell
      slug={view.slug}
      backend={backend}
      hydrate={view.hydrate}
      initialBlockly={view.blockly}
      tutor={(ctl) => (catalog ? <TutorPanel ctl={ctl} catalog={catalog} mode="session" sessionId={view.sessionId} initial={view.chat} /> : null)}
    />
  );
}
