/**
 * 학생 실험 서비스 — 여러 단계를 거치는 서버 작업 (Route Handler는 입력 검증·인증만)
 * 각 함수는 오류 경계(try)를 두고 게이트 오류만 그대로 전달한다.
 */
import "server-only";
import { rpc, rpcRow, normalizeError } from "./rpc";
import { checkValue, runProgram } from "./simulation";
import { latestRunProgram, runForUser, sessionForUser } from "./sessions";
import { getCatalog } from "@/lib/engine/experiments";
import { changedVariables } from "@/lib/engine/rules/variables";
import type { Program } from "@/lib/engine/types";

interface Begin { seed: string; slug: string; next_run_no: number; program_version: number; max_runs: number | null }

/** 실행 (지침 3.1·3.2·3.4): DB가 예측 여부 확인 → 세션 seed로 서버 시뮬레이션 → runs 누적 */
export async function runForStudent(userId: string, sessionId: string, program: Program) {
  try {
    const begin = await rpcRow<Begin>("app_begin_run", { p_student: userId, p_session: sessionId });
    if (begin.max_runs && begin.next_run_no > begin.max_runs) throw new Error("forbidden");
    const catalog = getCatalog(begin.slug);
    if (!catalog) throw new Error("not_found");
    const result = runProgram(begin.slug, program, begin.seed, begin.next_run_no);
    const prev = (await latestRunProgram(sessionId)) as Program | null;
    const changed = changedVariables(prev, program, catalog.variableOptions, catalog.isTrialEnd);
    await rpc("app_record_run", {
      p_student: userId, p_session: sessionId, p_run_no: begin.next_run_no, p_program_version: begin.program_version,
      p_program: program, p_seed: begin.seed, p_ok: result.ok, p_diagnostics: result.diagnostics,
      p_measurements: result.measurements, p_calc: result.calcRequests, p_series: result.series, p_changed: changed,
    });
    return { runNo: begin.next_run_no, changedVars: changed, ...result };
  } catch (e) {
    throw normalizeError(e);
  }
}

export interface CheckInputArgs { sessionId: string; runNo: number; key: string; value: number; unit: string }

/** 계산값 채점 (지침 5.3) — 저장된 실행을 재현해 정답 계산, 응답은 정오·오류 유형만 */
export async function checkForStudent(userId: string, a: CheckInputArgs) {
  try {
    const session = await sessionForUser(a.sessionId);
    if (session.studentId !== userId) throw new Error("forbidden");
    const run = await runForUser(a.sessionId, a.runNo);
    const result = checkValue({ slug: session.slug, program: run.program as Program, seed: session.seed, runNo: a.runNo, key: a.key, value: a.value, unit: a.unit });
    if (!result) throw new Error("not_found");
    const attempt = await rpc<number>("app_record_check", {
      p_student: userId, p_session: a.sessionId, p_run_no: a.runNo, p_key: a.key, p_value: a.value, p_unit: a.unit,
      p_correct: result.correct, p_error: result.errorType,
    });
    return { ...result, attempt };
  } catch (e) {
    throw normalizeError(e);
  }
}

export interface PredictArgs { sessionId: string; runNo: number | null; target: string; choice: string; rationale: string; hintsUsed: number; matched?: boolean | null; rationaleAfter?: string; sketch?: (number | null)[] }

/** 예측 저장(3.1)과 결과 후 비교 설명(3.3) */
export async function predictForStudent(userId: string, p: PredictArgs) {
  try {
    const id = await rpc<number>("app_upsert_prediction", {
      p_student: userId, p_session: p.sessionId, p_target: p.target, p_choice: p.choice, p_rationale: p.rationale, p_hints: p.hintsUsed, p_run_no: p.runNo,
    });
    if (p.sketch) await rpc("app_set_prediction_sketch", { p_student: userId, p_session: p.sessionId, p_target: p.target, p_sketch: p.sketch });
    if (typeof p.matched === "boolean" && p.rationaleAfter) {
      await rpc("app_explain_prediction", { p_student: userId, p_session: p.sessionId, p_target: p.target, p_matched: p.matched, p_text: p.rationaleAfter });
    }
    return { predictionId: id };
  } catch (e) {
    throw normalizeError(e);
  }
}
