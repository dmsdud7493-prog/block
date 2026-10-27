/** fixtures/prototypes/*.json 로더 — 압축 표기("E:water", "Q:50:mL", "P:branch")를 Program으로 바꾼다 */
import fs from "node:fs";
import path from "node:path";
import type { Program, SlotValue, Step, Unit, VariableDecl } from "@/lib/engine/types";

interface RawScenario {
  name: string;
  steps: string[][];
  variables?: [VariableDecl["role"], string | null][];
  expect: { ok: boolean; measurements?: Record<string, number>; calcKeys?: string[]; codes?: string[]; series?: Record<string, number> };
}

export interface Scenario {
  name: string;
  program: Program;
  expect: RawScenario["expect"];
}

function slot(token: string): SlotValue | null {
  if (token === "_") return null;
  const [kind, a, b] = token.split(":");
  if (kind === "E") return { kind: "equip", id: a };
  if (kind === "P") return { kind: "pos", id: a };
  if (kind === "Q") return { kind: "quant", value: Number(a), unit: b as Unit };
  throw new Error(`bad slot token ${token}`);
}

export function loadScenarios(slug: string): Scenario[] {
  const file = path.resolve(__dirname, "../../../fixtures/prototypes", `${slug}.json`);
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { scenarios: RawScenario[] };
  return raw.scenarios.map((sc) => {
    const steps: Step[] = sc.steps.map(([action, ...slots], i) => ({ blockId: `s${i + 1}`, action, slots: slots.map(slot) }));
    const variables: VariableDecl[] = (sc.variables ?? []).map(([role, optionId], i) => ({ blockId: `v${i + 1}`, role, optionId }));
    return { name: sc.name, program: { experiment: slug, steps, variables }, expect: sc.expect };
  });
}
