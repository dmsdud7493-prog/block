"use client";
/** 저장되는 실제 세션 — 같은 LabShell에 세션 백엔드를 연결 */
import { useMemo } from "react";
import LabShell from "./LabShell";
import { sessionBackend } from "./backend";
import type { SessionView } from "./types";

export default function SessionLab({ view }: { view: SessionView }) {
  const backend = useMemo(() => sessionBackend(view.sessionId), [view.sessionId]);
  return <LabShell slug={view.slug} backend={backend} hydrate={view.hydrate} initialBlockly={view.blockly} />;
}
