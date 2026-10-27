/**
 * 변인 설계 검사 (지침 1.2, 2.1, 2.3).
 * 학생이 선언한 변인 블록과 실제 절차(시도별 단계)를 비교해 누락·모순을 진단한다.
 */
import type { Diagnostic, Program, Step, VariableDecl } from "../types";
import type { VariableOption } from "../experiments/types";

export function splitTrials(steps: Step[], isTrialEnd: (s: Step) => boolean): Step[][] {
  return steps.reduce<Step[][]>((acc, step) => {
    const last = acc[acc.length - 1];
    const updated = [...acc.slice(0, -1), [...last, step]];
    return isTrialEnd(step) ? [...updated, []] : updated;
  }, [[]]).filter((t) => t.length > 0);
}

const warn = (blockId: string, code: string, message: string): Diagnostic => ({
  blockId, severity: "warn", code, message, guideline: "2.3",
});

function distinctValues(opt: VariableOption, trials: Step[][]): unknown[] {
  const vals = trials.map((t) => opt.extract?.(t) ?? null).filter((v) => v !== null);
  return [...new Set(vals.map((v) => String(v)))];
}

function checkDecl(decl: VariableDecl, opt: VariableOption | undefined, trials: Step[][]): Diagnostic | null {
  if (!decl.optionId) return warn(decl.blockId, "variable_unset", "변인 블록의 선택지를 골라 주세요.");
  if (!opt) return warn(decl.blockId, "variable_unknown", "이 실험에 없는 변인이에요.");
  if (!opt.roles.includes(decl.role as VariableOption["roles"][number])
    && !(decl.role.endsWith("_group") && opt.roles.includes("group"))) {
    return warn(decl.blockId, "variable_role_mismatch", `'${opt.label}'은(는) 이 칸에 어울리지 않아요. 무엇을 바꾸고 무엇을 같게 할지 다시 생각해 볼까요?`);
  }
  if (!opt.extract || trials.length < 2) return null;
  const distinct = distinctValues(opt, trials);
  if (decl.role === "controlled" && distinct.length > 1) {
    return warn(decl.blockId, "controlled_var_mismatch", `통제변인 '${opt.label}'이(가) 시도마다 달라요 (${distinct.join(", ")}). 같게 맞춰야 비교할 수 있어요.`);
  }
  if (decl.role === "independent" && distinct.length < 2) {
    return warn(decl.blockId, "independent_not_varied", `조작 변인 '${opt.label}'이(가) 모든 시도에서 같아요. 무엇을 다르게 해서 비교할까요?`);
  }
  return null;
}

export function checkVariables(
  program: Program,
  options: VariableOption[],
  isTrialEnd: (s: Step) => boolean,
): Diagnostic[] {
  const byId = new Map(options.map((o) => [o.id, o]));
  const trials = splitTrials(program.steps, isTrialEnd);
  const perDecl = program.variables
    .map((d) => checkDecl(d, d.optionId ? byId.get(d.optionId) : undefined, trials))
    .filter((d): d is Diagnostic => d !== null);
  const roles = new Set(program.variables.map((d) => d.role));
  const missing = program.variables.length > 0 && !roles.has("independent")
    ? [warn(program.variables[0].blockId, "independent_missing", "무엇을 바꿔 볼지(조작 변인) 블록이 아직 없어요.")]
    : [];
  return [...perDecl, ...missing];
}

/**
 * 직전 실행 대비 바뀐 변인 라벨 (지침 3.3·3.4). 두 개 이상이면 튜터가
 * "어느 변인 때문인지 알 수 있을까?"를 먼저 묻는다.
 */
export function changedVariables(
  prev: Program | null,
  next: Program,
  options: VariableOption[],
  isTrialEnd: (s: Step) => boolean,
): string[] {
  if (!prev) return [];
  const sig = (p: Program, o: VariableOption) =>
    splitTrials(p.steps, isTrialEnd).map((t) => String(o.extract?.(t) ?? "")).join("|");
  return options
    .filter((o) => o.extract && o.roles.some((r) => r === "independent" || r === "controlled"))
    .filter((o) => sig(prev, o) !== sig(next, o))
    .map((o) => o.label);
}
