/**
 * <상태> 주입 (지침 5.1, R4): 현재 단계·블록 문장·점검 결과·예측 여부·채점 결과·바뀐 변인.
 * 학생 이름·학교·연락처는 넣지 않는다. 정답값도 넣지 않는다(누설 검사는 서버가 따로 한다).
 */
import { z } from "zod";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { Program } from "@/lib/engine/types";
import { renderProgram } from "@/lib/engine/dsl/render";
import { VARIABLE_BLOCKS } from "@/lib/engine/dsl/variableBlocks";

export const tutorContextSchema = z.object({
  phase: z.enum(["design", "predict", "run", "interpret", "report"]),
  predictionTargetsDone: z.array(z.string().max(40)).max(10),
  diagnostics: z.array(z.object({ code: z.string().max(60), message: z.string().max(300), severity: z.enum(["error", "warn", "info"]) })).max(12),
  checks: z.array(z.object({ key: z.string().max(80), label: z.string().max(60), correct: z.boolean().nullable(), errorType: z.string().max(30).nullable(), attempts: z.number().int().min(0).max(999) })).max(20),
  measurements: z.array(z.object({ label: z.string().max(40), subject: z.string().max(40), value: z.number(), unit: z.string().max(20), trial: z.number().int() })).max(40),
  changedVars: z.array(z.string().max(60)).max(10),
  runOk: z.boolean().nullable(),
  idleSeconds: z.number().min(0).max(36000),
  lastHintLevel: z.number().int().min(-1).max(3),
  nudgeSent: z.boolean(),
  reportSection: z.string().max(40).nullable(),
  /** 지금 열려 있는 '오늘의 미션'(없으면 null) */
  mission: z.string().max(120).nullable().optional(),
});

export type TutorContext = z.infer<typeof tutorContextSchema>;

export interface TutorState {
  unit: string;
  goal: string;
  step: TutorContext["phase"];
  prediction_submitted: boolean;
  predictions_pending: string[];
  blocks_summary: string[];
  variables: string[];
  check_panel: TutorContext["diagnostics"];
  run_ok: boolean | null;
  measurements: TutorContext["measurements"];
  check_results: { label: string; correct: boolean | null; error_type: string | null; attempts: number }[];
  changed_vars: string[];
  idle_seconds: number;
  nudge_sent: boolean;
  tone: "haeyo" | "banmal";
  scaffold_level: number;
  hint_level_max: number;
  student_attempted: boolean;
  fail_count: number;
  report_section: string | null;
  mission: string | null;
}

function variableLines(catalog: AnyCatalog, program: Program): string[] {
  return program.variables.filter((v) => v.optionId).map((v) => {
    const role = VARIABLE_BLOCKS.find((b) => b.role === v.role)?.label ?? v.role;
    const label = catalog.variableOptions.find((o) => o.id === v.optionId)?.label ?? "";
    return `${role}: ${label}${v.rationale ? ` (이유: ${v.rationale.slice(0, 80)})` : ""}`;
  });
}

export interface StateInput {
  catalog: AnyCatalog;
  program: Program;
  ctx: TutorContext;
  tone: "haeyo" | "banmal";
  scaffoldLevel: number;
  hintLevelMax: number;
  studentAttempted: boolean;
  failCount: number;
}

export function buildState(i: StateInput): TutorState {
  const pending = i.catalog.predictionTargets.map((t) => t.id).filter((id) => !i.ctx.predictionTargetsDone.includes(id));
  return {
    unit: i.catalog.title,
    goal: i.catalog.goal,
    step: i.ctx.phase,
    prediction_submitted: i.ctx.predictionTargetsDone.length > 0,
    predictions_pending: pending,
    blocks_summary: renderProgram(i.catalog, i.program.steps).slice(0, 40),
    variables: variableLines(i.catalog, i.program),
    check_panel: i.ctx.diagnostics,
    run_ok: i.ctx.runOk,
    measurements: i.ctx.measurements,
    check_results: i.ctx.checks.map((c) => ({ label: c.label, correct: c.correct, error_type: c.errorType, attempts: c.attempts })),
    changed_vars: i.ctx.changedVars,
    idle_seconds: Math.round(i.ctx.idleSeconds),
    nudge_sent: i.ctx.nudgeSent,
    tone: i.tone,
    scaffold_level: i.scaffoldLevel,
    hint_level_max: i.hintLevelMax,
    student_attempted: i.studentAttempted,
    fail_count: i.failCount,
    report_section: i.ctx.reportSection,
    mission: i.ctx.mission ?? null,
  };
}

export function stateBlock(state: TutorState): string {
  return `<상태>\n${JSON.stringify(state)}\n</상태>`;
}
