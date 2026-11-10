/** 보고서 활동지(ADR-P20): 과정 = 활동 1, 2…, 자료 해석 = 자료 1, 2… */
import { describe, expect, it } from "vitest";
import { densityCatalog } from "@/lib/engine/experiments/density/catalog";
import { boilingCatalog } from "@/lib/engine/experiments/boiling/catalog";
import { separation1Catalog } from "@/lib/engine/experiments/separation1/catalog";
import { densityPhysics } from "@/lib/engine/experiments/density/physics";
import { simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { NO_NOISE } from "@/lib/engine/rng";
import { activitiesOf, activityDefs, dataOf } from "@/lib/report/activities";
import { initialLabState } from "@/components/lab/state";
import type { LabState, RunRecord } from "@/components/lab/types";
import { E, Q, S, prog } from "../engine/helpers";

const src: PhysicsSource = { params: densityPhysics.sessionParams(null, { textbookMode: true }), rng: NO_NOISE, noisy: false };
const liquid = (l: string) => [S("a1", E("cylinder"), E("scale")), S("a2", E(l), Q(50, "mL")), S("a3", E(l)), S("a4", E(l)), S("a5")];
const iron = (x: string) => [S("a4", E(x)), S("a2", E("water"), Q(50, "mL")), S("a7", E(x), E("cylinder")), S("a8", E("cylinder")), S("a5")];
const together = [S("a6", E("beaker"), E("water"), Q(50, "mL")), S("a6", E("beaker"), E("oil"), Q(50, "mL")), S("a7", E("iron_big"), E("beaker")), S("a7", E("iron_small"), E("beaker"))];

function stateOf(steps: ReturnType<typeof S>[]): LabState {
  const program = prog("density", steps);
  const r = simulate(program, densityCatalog, src);
  const run = { runNo: 1, ok: r.ok, program, frames: r.frames, measurements: r.measurements, calcRequests: r.calcRequests, series: r.series, diagnostics: [], changedVars: [] } as unknown as RunRecord;
  const calc = Object.fromEntries(r.calcRequests.map((c) => [c.key, { key: c.key, runNo: 1, value: "1", unit: "g/mL", attempts: 1, correct: true, errorType: null, hint: null }]));
  return { ...initialLabState("density"), program, runs: [run], calc } as LabState;
}

describe("활동 나누기", () => {
  it("밀도: 액체 → 금속 → 한 비커, 세 활동으로 나뉘고 단계에 ➊➋ 번호가 붙는다", () => {
    const s = stateOf([...liquid("water"), ...liquid("oil"), ...iron("iron_big"), ...iron("iron_small"), ...together]);
    const acts = activitiesOf(densityCatalog, s);
    expect(acts.map((a) => a.title)).toEqual(densityCatalog.reportActivities!.map((a) => a.title));
    expect(acts[0].steps.split("\n")).toHaveLength(10);
    expect(acts[0].steps.startsWith("➊ ")).toBe(true);
    expect(acts[1].steps).toContain("철조각");
  });
  it("밀도 자료: 활동마다 자료 하나 — 표(맞힌 계산값 포함)와 한 비커 관찰", () => {
    const s = stateOf([...liquid("water"), ...liquid("oil"), ...iron("iron_big"), ...iron("iron_small"), ...together]);
    const data = dataOf(densityCatalog, s, ["물이 더 무겁다"]);
    expect(data).toHaveLength(3);
    expect(data[0].title).toContain("액체");
    expect(data[0].rows.map((r) => r[1])).toEqual(["물", "식용유"]);
    expect(data[0].columns).toContain("밀도(g/mL)");
    expect(data[0].note).toBe("물이 더 무겁다");
    expect(data[2].rows).toEqual([]);
    expect(data[2].observations[0]).toMatch(/^비커 속에서 아래부터 .*물 → 식용유 순서로 자리 잡았어요\.$/);
  });
  it("학생이 먼저 한 활동이 활동 1이 된다(금속부터 하면 금속이 1)", () => {
    const s = stateOf([...iron("iron_big"), ...liquid("water")]);
    expect(activitiesOf(densityCatalog, s).map((a) => a.title)).toEqual([densityCatalog.reportActivities![1].title, densityCatalog.reportActivities![0].title]);
  });
  it("카탈로그에 활동이 없으면 측정 대상마다 활동 하나, 대상이 하나면 실험 이름으로", () => {
    expect(activityDefs(boilingCatalog).map((a) => a.title)).toEqual(["물의 끓는점 측정하기", "에탄올의 끓는점 측정하기"]);
    expect(activityDefs(separation1Catalog).map((a) => a.title)).toEqual(["끓는점 차를 이용한 혼합물 분리하기"]);
  });
  it("실행 기록이 없으면 자료는 비고, 과정은 지금 블록으로 만든다", () => {
    const s = { ...initialLabState("density"), program: prog("density", liquid("water")) } as LabState;
    expect(dataOf(densityCatalog, s)).toEqual([]);
    expect(activitiesOf(densityCatalog, s)).toHaveLength(1);
  });
});

describe("미션별 보고서(미션을 마친 실행들을 한 장으로)", () => {
  /** 미션마다 블록을 바꿔 따로 실행한 기록 — 실행 번호와 계산값이 실행마다 붙는다 */
  function multiRun(parts: ReturnType<typeof S>[][]): LabState {
    const runs = parts.map((steps, i) => {
      const program = prog("density", steps);
      const r = simulate(program, densityCatalog, src);
      return { runNo: i + 1, ok: r.ok, program, frames: r.frames, measurements: r.measurements, calcRequests: r.calcRequests, series: r.series, diagnostics: [], changedVars: [] } as unknown as RunRecord;
    });
    const calc = Object.fromEntries(runs.flatMap((run) => run.calcRequests.map((c) => [c.key, { key: c.key, runNo: run.runNo, value: "1", unit: "g/mL", attempts: 1, correct: true, errorType: null, hint: null }])));
    return { ...initialLabState("density"), program: runs[runs.length - 1].program, runs, calc } as LabState;
  }
  const oilThenWater = [S("a6", E("beaker"), E("oil"), Q(50, "mL")), S("a6", E("beaker"), E("water"), Q(50, "mL")), S("a7", E("iron_big"), E("beaker")), S("a7", E("iron_small"), E("beaker"))];

  it("미션 1·2·3을 따로 실행해도 과정은 미션 순서대로 활동 1·2·3, 자료도 셋", () => {
    const s = multiRun([[...liquid("water"), ...liquid("oil")], [...iron("iron_big"), ...iron("iron_small")], oilThenWater]);
    const acts = activitiesOf(densityCatalog, s);
    expect(acts.map((a) => a.title)).toEqual(densityCatalog.reportActivities!.map((a) => a.title));
    expect(acts[0].steps).toContain("식용유");
    expect(acts[1].steps).toContain("철조각");
    expect(acts[1].steps).not.toContain("식용유");
    const data = dataOf(densityCatalog, s);
    expect(data.map((d) => d.title)).toEqual(densityCatalog.reportActivities!.map((a) => `${a.title} 결과`));
    expect(data[1].rows.map((r) => r[1])).toEqual(["큰 철조각", "작은 철조각"]);
  });

  it("식용유 위에 물을 부으면 물이 가라앉는 장면(sink)으로 표시하고 오래 보여 준다", () => {
    const s = multiRun([oilThenWater]);
    const ev = s.runs[0].frames.map((f) => f.event).find((e) => e.sink);
    expect(ev?.sink).toBe("water");
    expect(ev?.hold).toBe(2);
    expect(ev?.note).toMatch(/물이 식용유를 뚫고 아래로 가라앉았어요/);
  });
});
