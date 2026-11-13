/**
 * 용해도 미션 ③ — 질산 칼륨을 얼음물(0 °C)·실온(20 °C)·뜨거운 물(60 °C)에서 녹여 온도에 따른 녹는 양 비교 (사용자 요청 2026-11-13)
 * 시험관을 먼저 온도가 다른 물이 담긴 비커에 넣고(a7), 그 온도에서 더 녹지 않을 때까지 넣은 뒤 총량을 기록한다.
 */
import { describe, expect, it } from "vitest";
import { solubilityCatalog } from "@/lib/engine/experiments/solubility/catalog";
import { solubilityPhysics } from "@/lib/engine/experiments/solubility/physics";
import { simulate, type PhysicsSource } from "@/lib/engine/simulator/run";
import { NO_NOISE } from "@/lib/engine/rng";
import { runTarget } from "@/lib/engine/predictionScope";
import { missionProgress, missionRuns } from "@/components/lab/missions";
import { initialLabState } from "@/components/lab/state";
import { activitiesOf } from "@/lib/report/activities";
import type { LabState, RunRecord } from "@/components/lab/types";
import type { Program } from "@/lib/engine/types";
import { E, Q, S, prog } from "../engine/helpers";

const src: PhysicsSource = { params: solubilityPhysics.sessionParams(null, { textbookMode: true }), rng: NO_NOISE, noisy: false };

/** 한 시험관: (비커에 담그기) → 떠서 넣기 → 가라앉을 때까지 → 총량 기록 */
const tube = (id: string, bath: string | null, first: number, each: number, tare = false) => [
  S("a1", E(id), E("water"), Q(10, "g")),
  ...(bath ? [S("a7", E(id), E(bath))] : []),
  ...(tare ? [S("a2", E("scale"), E("weighing_paper"))] : []),
  S("a3", E("kno3"), Q(first, "g"), E("spatula")),
  S("a4", E("kno3"), E(id)),
  S("a5", E("kno3"), Q(each, "g")),
  S("a6", E("kno3")),
];

const mission3 = prog("solubility", [
  ...tube("tube_a", "ice_water", 1, 0.1, true),
  ...tube("tube_b", null, 2, 0.1),
  ...tube("tube_c", "hot_water", 8, 0.2),
]);

const roomOnly = (sub: string, id: string) => prog("solubility", [
  S("a1", E(id), E("water"), Q(10, "g")), S("a2", E("scale"), E("weighing_paper")),
  S("a3", E(sub), Q(1, "g"), E("spatula")), S("a4", E(sub), E(id)), S("a5", E(sub), Q(0.5, "g")), S("a6", E(sub)),
]);

function record(program: Program, runNo: number): RunRecord {
  const r = simulate(program, solubilityCatalog, src);
  return { ...r, runNo, program, ok: r.ok, changedVars: [] } as unknown as RunRecord;
}

const solveAll = (runs: RunRecord[]): LabState["calc"] => Object.fromEntries(runs.flatMap((r) => r.calcRequests.map((c) => [c.key + "#" + r.runNo, { key: c.key, runNo: r.runNo, value: "1", unit: "g/물 100 g", attempts: 1, correct: true, errorType: null, hint: null }])));

const state = (runs: RunRecord[], calc: LabState["calc"]): LabState => ({ ...initialLabState("solubility"), runs, calc } as LabState);

describe("용해도 미션 ③ — 온도에 따른 질산 칼륨의 녹는 양", () => {
  const r3 = record(mission3, 3);
  const temps = r3.measurements.filter((m) => m.key.startsWith("temp.kno3")).map((m) => m.value);
  const v = (k: string) => r3.measurements.find((m) => m.key === k)!.value;
  const dissolved = [2, 3, 5].map((t) => v(`added.kno3.t${t}`) - v(`residue.kno3.t${t}`));

  it("세 시험관을 0 °C·20 °C·60 °C에서 포화시켜 기록한다(실행 오류 없음)", () => {
    expect(r3.ok).toBe(true);
    expect(temps).toEqual([0, 20, 60]);
    expect(r3.calcRequests.map((c) => c.key)).toEqual(["diss.kno3.t2", "sol.kno3.t2", "diss.kno3.t3", "sol.kno3.t3", "diss.kno3.t5", "sol.kno3.t5"]);
  });

  it("온도가 높을수록 물 10 g에 녹는 양이 크게 늘어난다(교과서 13.3 → 31.6 → 109 g/물 100 g)", () => {
    expect(dissolved[0]).toBeCloseTo(1.33, 2);
    expect(dissolved[1]).toBeCloseTo(3.16, 2);
    expect(dissolved[2]).toBeCloseTo(10.9, 2);
  });

  it("실행 전 예측은 온도 질문(얼음물·뜨거운 물을 함께 쓰면)", () => {
    expect(runTarget(solubilityCatalog, mission3)).toBe("kno3_temp");
    expect(runTarget(solubilityCatalog, roomOnly("kno3", "tube_a"))).toBe("more_at_room");
  });

  it("미션 ①② 뒤 세 온도의 계산을 맞히면 미션 ③ 완료, 보고서 활동 3은 미션 ③ 실행", () => {
    const r1 = record(roomOnly("kno3", "tube_a"), 1);
    const r2 = record(roomOnly("cuso4", "tube_b"), 2);
    const runs = [r1, r2, r3];
    const calc = Object.fromEntries(Object.values(solveAll(runs)).map((e) => [e.key, e]));
    // 같은 key가 여러 실행에 있으면 마지막 실행 것이 남는다 — 실행마다 key가 다르게 회차를 매긴다
    const p = missionProgress(solubilityCatalog, state(runs, calc));
    expect(p.done).toEqual([true, true, true]);
    const chosen = missionRuns(solubilityCatalog, state(runs, calc))!.map((r) => r.runNo);
    expect(chosen[2]).toBe(3);
    expect(activitiesOf(solubilityCatalog, state(runs, calc)).map((a) => a.title)[2]).toBe("온도에 따른 질산 칼륨의 용해도 비교하기");
  });

  it("실온에서만 맞히면 미션 ③은 아직", () => {
    const r1 = record(roomOnly("kno3", "tube_a"), 1);
    const r2 = record(roomOnly("cuso4", "tube_b"), 2);
    const calc = Object.fromEntries(Object.values(solveAll([r1, r2])).map((e) => [e.key, e]));
    expect(missionProgress(solubilityCatalog, state([r1, r2], calc)).done).toEqual([true, true, false]);
  });
});
