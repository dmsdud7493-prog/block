import { describe, expect, it } from "vitest";
import * as Blockly from "blockly/core";
import { allBlockJson, T, toolbox } from "@/lib/blocks/blockTypes";
import { registerAutoWrap } from "@/lib/blocks/autoWrap";
import { workspaceToProgram } from "@/lib/blocks/program";
import { densityCatalog } from "@/lib/engine/experiments/density/catalog";
import { dryRun } from "@/lib/engine/simulator/run";

registerAutoWrap();
Blockly.common.defineBlocksWithJsonArray(allBlockJson(densityCatalog));

function build(state: object) {
  const ws = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(state, ws);
  return ws;
}

const item = (id: string) => ({ block: { type: T.item("density", id) } });
const qty = (v: number) => ({ block: { type: T.quant("mL"), fields: { VALUE: v } } });

describe("Blockly → Program (지침 2.2)", () => {
  it("절차 스택과 변인 스택을 구분해 읽는다", () => {
    const ws = build({
      blocks: {
        blocks: [
          {
            type: T.procStart, x: 0, y: 0,
            next: { block: { type: T.action("density", "a1"), id: "z", inputs: { S0: item("cylinder"), S1: item("scale") },
              next: { block: { type: T.action("density", "a2"), id: "p", inputs: { S0: item("water"), S1: qty(50) } } } } },
          },
          {
            type: T.designStart, x: 0, y: 200,
            next: { block: { type: T.variable("density", "controlled"), id: "v", fields: { OPTION: "liquid_volume" } } },
          },
        ],
      },
    });
    const program = workspaceToProgram(ws, "density");
    expect(program.steps).toEqual([
      { blockId: "z", action: "a1", slots: [{ kind: "equip", id: "cylinder" }, { kind: "equip", id: "scale" }] },
      { blockId: "p", action: "a2", slots: [{ kind: "equip", id: "water" }, { kind: "quant", value: 50, unit: "mL" }] },
    ]);
    expect(program.variables).toEqual([{ blockId: "v", role: "controlled", optionId: "liquid_volume" }]);
    // 통제변인만 있고 조작 변인이 없으면 안내가 나온다 (지침 2.3)
    expect(dryRun(program, densityCatalog).map((d) => d.code)).toEqual(["independent_missing"]);
  });

  it("빈 구멍은 null 슬롯 → slot_invalid 진단이 그 블록 id로 돌아온다", () => {
    const ws = build({ blocks: { blocks: [{ type: T.procStart, next: { block: { type: T.action("density", "a3"), id: "e" } } }] } });
    const diags = dryRun(workspaceToProgram(ws, "density"), densityCatalog);
    expect(diags).toMatchObject([{ blockId: "e", code: "slot_invalid", guideline: "2.3" }]);
  });

  it("도구 상자에 변인 설계 카테고리가 있다 (지침 2.1)", () => {
    const names = toolbox(densityCatalog).contents.map((c) => c.name);
    expect(names).toEqual(["실험 계획", "준비물", "용량/수치", "행동"]);
  });
});
