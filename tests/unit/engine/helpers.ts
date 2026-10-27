import type { Program, SlotValue, Step, Unit, VariableDecl } from "@/lib/engine/types";

export const E = (id: string): SlotValue => ({ kind: "equip", id });
export const Q = (value: number, unit: Unit): SlotValue => ({ kind: "quant", value, unit });
export const P = (id: string): SlotValue => ({ kind: "pos", id });

let counter = 0;
export function S(action: string, ...slots: (SlotValue | null)[]): Step {
  counter += 1;
  return { blockId: `b${counter}`, action, slots };
}

export function prog(experiment: string, steps: Step[], variables: VariableDecl[] = []): Program {
  return { experiment, steps, variables };
}

export interface Fixture {
  name: string;
  program: Program;
  expect: {
    ok: boolean;
    measurements?: Record<string, number>;
    calcKeys?: string[];
    codes?: string[];
  };
}
