/** 그래프 대신 표로 비교(용해도 차 분리) · 용해도 온도 그래프 (2026-11-21) */
import { describe, expect, it } from "vitest";
import { compareRuns } from "@/lib/report/compare";
import { bestSolubilityPoints, solubilityPoints } from "@/lib/report/solubility";
import { separation2Catalog } from "@/lib/engine/experiments/separation2/catalog";
import { solubilityCatalog } from "@/lib/engine/experiments/solubility/catalog";
import { noGraph } from "@/components/lab/state";
import type { CalcEntry, RunRecord } from "@/components/lab/types";

const m = (key: string, label: string, value: number, unit: string, subject: string, trial = 1) => ({ key, trial, label, value, unit, subject });
const run = (runNo: number, mass: number, ok = true): RunRecord => ({
  runNo, ok, frames: [], series: [], diagnostics: [], changedVars: [], program: { experiment: "separation2", steps: [], variables: [] },
  measurements: [m("water.t1", "물의 질량", 100, "g", "water"), m("added.boric_acid.t1", "넣은 붕산의 양", 10, "g", "boric_acid"), m("crystal_mass.t1", "말린 결정의 질량", mass, "g", "crystal")],
  calcRequests: [{ key: "precip.boric_acid.t1", trial: 1, label: "석출되는 붕산의 양(이론값)", unit: "g", subject: "boric_acid", inputs: [] }],
} as unknown as RunRecord);
const solved = (runNo: number): Record<string, CalcEntry> => ({ "precip.boric_acid.t1": { key: "precip.boric_acid.t1", runNo, value: "7.3", unit: "g", attempts: 1, correct: true, errorType: null, hint: null } });

describe("compareRuns", () => {
  it("성공한 실행마다 한 줄, 결정 질량은 1번째와의 차이를 보여 준다", () => {
    const t = compareRuns([run(1, 7.1), run(2, 0, false), run(3, 7.4)], solved(3));
    expect(t.columns[0]).toBe("실험");
    expect(t.columns).toContain("말린 결정의 질량(g)");
    expect(t.columns[t.columns.length - 1]).toBe("1번째와의 차이(g)");
    expect(t.rows.map((r) => r[0])).toEqual(["1번째", "2번째"]);
    expect(t.rows[0][t.rows[0].length - 1]).toBe("기준");
    expect(t.rows[1][t.rows[1].length - 1]).toBe("+0.3");
    // 회차마다 같은 값은 표에서 빼고 한 줄로
    expect(t.columns).not.toContain("물의 질량(g)");
    expect(t.same).toEqual(["물의 질량 100 g", "넣은 붕산의 양 10 g"]);
  });
  it("학생이 맞힌 계산값은 그 실행 줄에만 들어간다(정답값은 쓰지 않음)", () => {
    const t = compareRuns([run(1, 7.1), run(2, 6.9)], solved(2));
    const col = t.columns.indexOf("석출되는 붕산의 양(이론값)(g)");
    expect(col).toBeGreaterThan(0);
    expect([t.rows[0][col], t.rows[1][col]]).toEqual(["—", "7.3"]);
    expect(t.rows[1][t.rows[1].length - 1]).toBe("−0.2");
  });
  it("한 번만 실험했으면 한 줄", () => expect(compareRuns([run(1, 7.1)], {}).rows).toHaveLength(1));
});

describe("그래프 없는 실험", () => {
  it("용해도 차 분리는 그래프 없이 표로, 용해도 측정은 그래프로", () => {
    expect(noGraph(separation2Catalog)).toBe(true);
    expect(noGraph(solubilityCatalog)).toBe(false);
    expect(separation2Catalog.predictionTargets.find((t) => t.id === "filter_split")?.beforeRun).toBe(true);
  });
});

describe("용해도 온도 그래프", () => {
  const tube = (t: number, temp: number, added: number, residue: number) => [m(`added.kno3.t${t}`, "넣은 총량", added, "g", "kno3", t), m(`residue.kno3.t${t}`, "남은 양", residue, "g", "kno3", t), m(`temp.kno3.t${t}`, "온도", temp, "°C", "kno3", t)];
  const r = (runNo: number, ms: ReturnType<typeof m>[]) => ({ ...run(runNo, 0), measurements: ms } as unknown as RunRecord);
  const three = r(1, [...tube(1, 0, 2, 0.7), ...tube(2, 20, 4, 0.8), ...tube(3, 60, 12, 1)]);
  const room = r(2, tube(1, 20, 4, 0.9));
  it("미션 ③(세 온도) 뒤에 실온 실험을 다시 해도 세 온도의 점을 그린다", () => {
    expect(bestSolubilityPoints([three, room])).toEqual([{ subject: "kno3", points: [{ x: 0, y: 1.3 }, { x: 20, y: 3.2 }, { x: 60, y: 11 }] }]);
  });
  it("회차를 고르면 그 회차의 점만", () => expect(solubilityPoints(three, [3])[0].points).toEqual([{ x: 60, y: 11 }]));
});
