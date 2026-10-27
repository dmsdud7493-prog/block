/** 실험실 상태 → 튜터 맥락 (클라이언트). 이름·연락처 없음, 정답 없음 */
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { LabState } from "@/components/lab/types";
import { latestRun } from "@/components/lab/state";
import type { TutorContext } from "@/lib/tutor/stateInjection";

export function buildTutorContext(s: LabState, catalog: AnyCatalog, extra: { idleSeconds: number; lastHintLevel: number; nudgeSent: boolean; reportSection: string | null }): TutorContext {
  const run = latestRun(s);
  const labelOf = (key: string) => run?.calcRequests.find((c) => c.key === key)?.label ?? key;
  return {
    phase: s.phase,
    predictionTargetsDone: s.predictions.filter((p) => p.choice).map((p) => p.target),
    diagnostics: s.diagnostics.slice(0, 12).map((d) => ({ code: d.code, message: d.message, severity: d.severity })),
    checks: Object.values(s.calc).slice(-20).map((c) => ({ key: c.key, label: labelOf(c.key), correct: c.correct, errorType: c.errorType, attempts: c.attempts })),
    measurements: (run?.measurements ?? []).slice(0, 40).map((m) => ({ label: m.label, subject: catalog.items.find((i) => i.id === m.subject)?.label ?? m.subject, value: m.value, unit: m.unit, trial: m.trial })),
    changedVars: run?.changedVars ?? [],
    runOk: run ? run.ok : null,
    idleSeconds: extra.idleSeconds,
    lastHintLevel: extra.lastHintLevel,
    nudgeSent: extra.nudgeSent,
    reportSection: extra.reportSection,
  };
}
