/**
 * 계산값 채점 (server-only, CLAUDE.md 규칙 3 · 지침 5.3).
 * 정답은 학생 세션의 측정값으로 서버에서 다시 계산하고, 응답에는 정오와 오류 유형만 담는다.
 */
import "server-only";
import type { CalcRequest, Measurement } from "../types";
import type { AnswerRule } from "../experiments/physicsTypes";
import { ERROR_HINTS, type ErrorType } from "./errorTypes";
import { CALC_ASSESSMENT } from "./assessment";

export interface CheckInput {
  request: CalcRequest;
  measurements: Measurement[];
  value: number;
  unit?: string;
  params: Record<string, number>;
  rules: AnswerRule[];
}

/** 클라이언트로 나가는 결과 — 정답값 필드 없음 */
export interface CheckResult {
  correct: boolean;
  errorType: ErrorType | null;
  hint: string | null;
  assessment: typeof CALC_ASSESSMENT.type;
}

const within = (v: number, target: number, tol: { rel?: number; abs?: number }): boolean => {
  const allowed = Math.max(tol.abs ?? 0, Math.abs(target) * (tol.rel ?? 0));
  return Math.abs(v - target) <= allowed + 1e-9;
};

function inputsOf(req: CalcRequest, ms: Measurement[]): number[] {
  return req.inputs.map((k) => ms.find((m) => m.key === k)?.value ?? Number.NaN);
}

function expectedFor(rule: AnswerRule, req: CalcRequest, inputs: number[], params: Record<string, number>): number {
  if (rule.fromParams) return rule.fromParams(req.subject, params, inputs);
  if (rule.family === "ratio") return inputs[0] / inputs[1];
  if (rule.family === "per100") return (inputs[0] / inputs[1]) * 100;
  return Number.NaN;
}

/** 오류 유형별 "그 실수를 했다면 나왔을 값" */
function alternatives(rule: AnswerRule, inputs: number[], expected: number): [ErrorType, number][] {
  const decimals: [ErrorType, number][] = [10, 0.1, 100, 0.01].map((f) => ["decimal", expected * f]);
  if (rule.family === "ratio") {
    const [a, b] = inputs;
    const men: [ErrorType, number][] = [-1, -0.5, 0.5, 1].map((d) => ["meniscus", a / (b + d)]);
    return [["swapped", b / a], ...decimals, ...men];
  }
  if (rule.family === "per100") return [["solvent_basis", inputs[0]], ...decimals];
  if (rule.family === "plateau") return [["unit", expected + 273.15], ["unit", expected + 273]];
  return decimals;
}

function diagnose(rule: AnswerRule, inputs: number[], expected: number, value: number): ErrorType {
  // 실수 후보는 더 좁게(1%) 맞춰 본다 — 넓으면 단순 계산 실수까지 다른 유형으로 오분류된다
  const altTol = { rel: 0.01, abs: rule.tolerance.abs };
  const alt = alternatives(rule, inputs, expected).find(([, v]) => within(value, v, altTol));
  if (alt) return alt[0];
  if (rule.family === "plateau") return "plateau";
  if (rule.family === "precipitate") return "table_read";
  return within(value, expected, { rel: 0.1 }) ? "rounding" : "other";
}

export function findRule(rules: AnswerRule[], key: string): AnswerRule | undefined {
  return rules.find((r) => key.startsWith(r.prefix));
}

export function checkCalc(input: CheckInput): CheckResult {
  const { request, value, unit } = input;
  const rule = findRule(input.rules, request.key);
  const base = { assessment: CALC_ASSESSMENT.type };
  if (!Number.isFinite(value)) return { ...base, correct: false, errorType: "not_number", hint: ERROR_HINTS.not_number };
  if (!rule) return { ...base, correct: false, errorType: "other", hint: ERROR_HINTS.other };
  const inputs = inputsOf(request, input.measurements);
  const expected = expectedFor(rule, request, inputs, input.params);
  const valueOk = within(value, expected, rule.tolerance);
  const unitOk = !unit || unit === rule.unitChoices[0];
  if (valueOk && unitOk) return { ...base, correct: true, errorType: null, hint: null };
  const errorType: ErrorType = valueOk ? "unit" : diagnose(rule, inputs, expected, value);
  return { ...base, correct: false, errorType, hint: ERROR_HINTS[errorType] };
}

/** 서버 내부 전용: 튜터 상태 주입(answers_private)에 쓰는 기대값 — 학생 응답으로 내보내지 않는다 */
export function expectedValue(input: Omit<CheckInput, "value" | "unit">): number {
  const rule = findRule(input.rules, input.request.key);
  if (!rule) return Number.NaN;
  return expectedFor(rule, input.request, inputsOf(input.request, input.measurements), input.params);
}
