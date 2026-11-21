/** 보고서 자료 다듬기(2026-11-21) — 번호 1·2·3, 온도–용해도 곡선 */
import { describe, expect, it } from "vitest";
import { deriveData } from "@/lib/report/derive";

const base = { title: "온도에 따른 질산 칼륨의 용해도 비교하기 결과", observations: [], series: [], note: "" };
const columns = ["번호", "물질", "물의 질량(g)", "온도(°C)", "넣은 총량(g)", "녹지 않고 남은 양(g)", "녹은 양(g)", "물 100 g에 녹는 양(g/물 100 g)"];
const row = (no: string, t: string, sol: string) => [no, "질산 칼륨", "10", t, "1", "0.1", "0.9", sol];

describe("deriveData", () => {
  it("예전 번호 2·3·5를 1·2·3으로 바꾸고, 온도–용해도 곡선을 만든다", () => {
    const d = deriveData({ ...base, columns, rows: [row("2", "0", "13.5"), row("3", "20", "32"), row("5", "60", "109.6")] });
    expect(d.rows.map((r) => r[0])).toEqual(["1", "2", "3"]);
    expect(d.series).toEqual([{ label: "질산 칼륨", points: [[0, 13.5], [20, 32], [60, 109.6]] }]);
    expect(d.axis?.y).toContain("용해도");
  });
  it("아직 못 맞힌 칸(—)은 빼고, 온도가 한 가지뿐이면 곡선을 그리지 않는다", () => {
    const d = deriveData({ ...base, columns, rows: [row("1", "20", "32"), row("2", "60", "—")] });
    expect(d.series).toEqual([]);
    expect(d.axis).toBeUndefined();
  });
  it("번호 칸이 없거나 다른 실험 표는 그대로", () => {
    const other = { ...base, columns: ["물질", "질량(g)"], rows: [["물", "20"]] };
    expect(deriveData(other)).toEqual(other);
  });
});
