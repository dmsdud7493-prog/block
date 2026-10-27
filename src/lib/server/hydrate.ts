/**
 * 저장된 세션 → 실험실 화면 상태. 마지막 실행의 프레임은 저장하지 않으므로 같은 seed로 다시 계산한다(결정론).
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { runProgram } from "./simulation";
import type { CalcEntry, PredictionRecord, RunRecord, SessionView } from "@/components/lab/types";
import type { Program } from "@/lib/engine/types";
import type { ErrorType } from "@/lib/engine/grader/errorTypes";
import { ERROR_HINTS } from "@/lib/engine/grader/errorTypes";


type RunRow = { run_no: number; ok: boolean; program: Program; diagnostics: RunRecord["diagnostics"]; measurements: RunRecord["measurements"]; calc_requests: RunRecord["calcRequests"]; series: RunRecord["series"]; changed_vars: string[] };

function toRun(r: RunRow, slug: string, seed: string, withFrames: boolean): RunRecord {
  const frames = withFrames ? runProgram(slug, r.program, seed, r.run_no).frames : [];
  return { runNo: r.run_no, ok: r.ok, frames, measurements: r.measurements, calcRequests: r.calc_requests, series: r.series, diagnostics: r.diagnostics, program: r.program, changedVars: r.changed_vars };
}

function toCalc(rows: { key: string; value: number; unit: string; is_correct: boolean; error_type: string | null; attempt: number; runs: { run_no: number } | null }[]): Record<string, CalcEntry> {
  return rows.reduce<Record<string, CalcEntry>>((acc, m) => ({
    ...acc,
    [m.key]: { key: m.key, runNo: m.runs?.run_no ?? 1, value: String(m.value), unit: m.unit, attempts: m.attempt, correct: m.is_correct, errorType: m.error_type as ErrorType | null, hint: m.error_type ? ERROR_HINTS[m.error_type as ErrorType] : null },
  }), {});
}

export async function loadSessionView(sessionId: string): Promise<SessionView | null> {
  try {
    return await loadSessionViewInner(sessionId);
  } catch {
    return null;
  }
}

async function loadSessionViewInner(sessionId: string): Promise<SessionView | null> {
  const db = await createClient();
  const { data: s } = await db.from("sessions").select("id, seed, status, inquiry, current_step, classes(settings), experiments(slug)").eq("id", sessionId).single();
  if (!s) return null;
  const slug = (s.experiments as unknown as { slug: string }).slug;
  const [prog, runs, preds, meas, report, sub, chat] = await Promise.all([
    db.from("block_programs").select("program, blockly, version").eq("session_id", sessionId).order("version", { ascending: false }).limit(1),
    db.from("runs").select("run_no, ok, program, diagnostics, measurements, calc_requests, series, changed_vars").eq("session_id", sessionId).order("run_no"),
    db.from("predictions").select("target, choice, rationale, hints_used, matched, rationale_after, sketch").eq("session_id", sessionId),
    db.from("measurements").select("key, value, unit, is_correct, error_type, attempt, runs(run_no)").eq("session_id", sessionId).order("attempt"),
    db.from("reports").select("content, ai_assisted_sections, version").eq("session_id", sessionId).maybeSingle(),
    db.from("submissions").select("rubric_scores, teacher_feedback, returned_at, submitted_at, late, version").eq("session_id", sessionId).maybeSingle(),
    db.from("chat_messages").select("role, content, meta").eq("session_id", sessionId).order("id", { ascending: false }).limit(40),
  ]);
  const runRows = (runs.data ?? []) as RunRow[];
  const runRecords = runRows.map((r, i) => toRun(r, slug, s.seed, i === runRows.length - 1));
  const predictions: PredictionRecord[] = (preds.data ?? []).map((p) => ({ target: p.target, choice: p.choice, rationale: p.rationale, hintsUsed: p.hints_used, matched: p.matched, rationaleAfter: p.rationale_after ?? undefined, ...(Array.isArray(p.sketch) ? { sketch: p.sketch as (number | null)[] } : {}) }));
  const latest = prog.data?.[0];
  const inquiry = s.inquiry as { problem?: string; hypothesis?: string };
  return {
    sessionId,
    slug,
    status: s.status,
    classSettings: (s.classes as unknown as { settings: Record<string, unknown> }).settings ?? {},
    blockly: (latest?.blockly as object) ?? null,
    report: report.data ? { content: report.data.content as Record<string, unknown>, aiAssisted: report.data.ai_assisted_sections, version: report.data.version } : null,
    submission: sub.data ?? null,
    chat: (chat.data ?? []).reverse().map((m) => {
      const meta = m.meta as { hint_level?: number; source?: string; nudge?: boolean };
      return { role: m.role as "user" | "assistant", content: m.content, hintLevel: meta.hint_level, source: meta.source, nudge: meta.nudge };
    }),
    hydrate: {
      program: (latest?.program as Program) ?? { experiment: slug, steps: [], variables: [] },
      runs: runRecords,
      predictions,
      calc: toCalc((meas.data ?? []) as unknown as Parameters<typeof toCalc>[0]),
      inquiry: { problem: inquiry?.problem ?? "", hypothesis: inquiry?.hypothesis ?? "" },
      graphOpened: runRecords.some((r) => r.ok) && predictions.some((p) => typeof p.matched === "boolean"),
      phase: runRecords.length ? "interpret" : "design",
      programVersion: latest?.version ?? 0,
    },
  };
}
