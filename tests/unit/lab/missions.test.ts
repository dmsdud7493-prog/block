import { describe, expect, it } from "vitest";
import { densityCatalog } from "@/lib/engine/experiments/density/catalog";
import { missionProgress } from "@/components/lab/missions";
import { initialLabState } from "@/components/lab/state";
import type { LabState, RunRecord } from "@/components/lab/types";

const req = (subject: string) => ({ key: `density.${subject}.t1`, trial: 1, label: "밀도", unit: "g/mL", subject, inputs: [] });
const run = (subjects: string[], settled: string[] = []): RunRecord => ({
  runNo: 1, ok: true, measurements: [], series: [], diagnostics: [], changedVars: [],
  program: { experiment: "density", steps: [], variables: [] },
  calcRequests: subjects.map(req),
  frames: settled.length ? [{ blockId: "b1", state: {}, event: { type: "dropSolid", note: "", settled } }] : [],
} as unknown as RunRecord);
const solved = (subjects: string[]) => Object.fromEntries(subjects.map((s) => [`density.${s}.t1`, { key: `density.${s}.t1`, runNo: 1, value: "1", unit: "g/mL", attempts: 1, correct: true, errorType: null, hint: null }]));
const state = (p: Partial<LabState>): LabState => ({ ...initialLabState(densityCatalog.slug), ...p } as LabState);
const ALL = ["iron_big", "iron_small", "water", "oil"];

describe("오늘의 미션 진행", () => {
  it("처음에는 ①이 지금 할 미션", () => {
    expect(missionProgress(densityCatalog, state({}))).toMatchObject({ done: [false, false, false], current: 0 });
  });
  it("물·식용유 계산을 맞히면 ① 완료, ②가 지금 할 미션", () => {
    const p = missionProgress(densityCatalog, state({ runs: [run(["water", "oil"])], calc: solved(["water", "oil"]) }));
    expect(p).toMatchObject({ done: [true, false, false], current: 1 });
  });
  it("틀린 계산은 세지 않는다", () => {
    const calc = { ...solved(["water"]), ...{ "density.oil.t1": { ...solved(["oil"])["density.oil.t1"], correct: false } } };
    expect(missionProgress(densityCatalog, state({ runs: [run(["water", "oil"])], calc })).done[0]).toBe(false);
  });
  it("③을 먼저 해도 ①②를 마치기 전에는 완료로 세지 않고, 마치면 함께 완료", () => {
    const early = missionProgress(densityCatalog, state({ runs: [run([], ALL)] }));
    expect(early.done).toEqual([false, false, false]);
    const later = missionProgress(densityCatalog, state({ runs: [run([], ALL), run(ALL)], calc: solved(ALL) }));
    expect(later).toMatchObject({ done: [true, true, true], current: 3 });
  });
  it("미션이 없는 실험은 빈 목록", async () => {
    const { meltingCatalog } = await import("@/lib/engine/experiments/melting/catalog");
    expect(missionProgress(meltingCatalog, state({})).missions).toEqual([]);
  });
});
