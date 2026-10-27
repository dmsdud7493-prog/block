// @vitest-environment jsdom
/** S8: 곡선 예측 그리기(터치 반경·키보드 대안), 평탄 구간·용해도 점·내 예상 선 계산, 실험 장면 접근성 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { useState } from "react";
import SketchPad, { HIT_RADIUS, sketchTimes, type Sketch } from "@/components/data/SketchPad";
import { plateausOf } from "@/components/data/TimeTempChart";
import { solubilityPoints } from "@/components/data/SolubilityChart";
import { sketchLines } from "@/components/data/ResultChart";
import MeltingScene from "@/components/monitor/scenes/MeltingScene";
import { getCatalog } from "@/lib/engine/experiments";
import { initialMeltingState } from "@/lib/engine/experiments/melting/model";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { RunRecord } from "@/components/lab/types";

afterEach(() => cleanup());
const spec = { xMax: 600, yMin: 20, yMax: 100, points: 5 };

function Harness() {
  const [v, setV] = useState<Sketch>([null, null, null, null, null]);
  return <SketchPad spec={spec} value={v} onChange={setV} />;
}

const run = (measurements: [string, number, string, number][], series: RunRecord["series"] = []): RunRecord => ({
  runNo: 1, ok: true, frames: [], diagnostics: [], calcRequests: [], changedVars: [], program: { experiment: "x", steps: [], variables: [] }, series,
  measurements: measurements.map(([key, value, subject, trial]) => ({ key, value, subject, trial, label: key, unit: "s" as const })),
});

describe("SketchPad (곡선 예측)", () => {
  it("접근성 위반이 없다", async () => {
    const { container } = render(<Harness />);
    expect((await axe(container)).violations.map((v) => v.id)).toEqual([]);
  });
  it("터치 누름 영역 반지름 ≥ 25px", () => expect(HIT_RADIUS).toBeGreaterThanOrEqual(25));
  it("키보드 대안: 숫자로 점을 찍으면 그림에 나타나고 범위를 벗어나면 잘린다", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("0초의 온도(℃)"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("600초의 온도(℃)"), { target: { value: "500" } });
    expect(screen.getByRole("img", { name: /2개 점/ })).toBeTruthy();
    expect((screen.getByLabelText("600초의 온도(℃)") as HTMLInputElement).value).toBe("100");
    expect(document.querySelectorAll("[data-hit-radius]").length).toBe(2);
  });
  it("시점은 0 ~ xMax를 같은 간격으로 나눈다", () => expect(sketchTimes(spec)).toEqual([0, 150, 300, 450, 600]));
});

describe("그래프 계산", () => {
  it("평탄 구간: 녹기 시작~끝, 증류 평탄 시작~끝, 끓기 시작~기록 끝", () => {
    const r = run([["meltStart.l.t1", 180, "l", 1], ["meltEnd.l.t1", 390, "l", 1], ["boil_start.w.t2", 300, "w", 2]],
      [{ key: "temp.w.t2", trial: 2, subject: "w", label: "", points: [{ t: 0, temp: 20 }, { t: 480, temp: 100 }] }]);
    expect(plateausOf(r).map((p) => [p.x1, p.x2])).toEqual([[180, 390], [300, 480]]);
  });
  it("용해도: 물질마다 (온도, 녹은 양) 점을 온도순으로", () => {
    const r = run([["dissolved.k.t1", 3.1, "k", 1], ["temp.k.t1", 20, "k", 1], ["dissolved.k.t2", 8, "k", 2], ["temp.k.t2", 60, "k", 2]]);
    expect(solubilityPoints(r)).toEqual([{ subject: "k", points: [{ x: 20, y: 3.1 }, { x: 60, y: 8 }] }]);
  });
  it("내 예상 선: 그린 점만 시점에 맞춰 잇는다", () => {
    const c = getCatalog("melting") as AnyCatalog;
    const lines = sketchLines(c, [{ target: "graph_shape", choice: "x", rationale: "xxxxx", hintsUsed: 0, sketch: [25, null, 44, 44, 44, 44, null, 60, 70] }]);
    expect(lines[0].points[0]).toEqual({ t: 0, temp: 25 });
    expect(lines[0].points).toHaveLength(7);
    expect(sketchLines(c, [])).toEqual([]);
  });
});

describe("실험 장면", () => {
  it("녹는점 장면은 이벤트 문구를 이름으로 갖는 그림이다", async () => {
    const s = { ...initialMeltingState(), shown: { bkr: true, hot: true, stand: true, tube: true } };
    const { container } = render(<MeltingScene state={s} event={{ type: "x", note: "비커에 물을 넣었어요." }} />);
    expect(screen.getByRole("img", { name: "비커에 물을 넣었어요." })).toBeTruthy();
    expect((await axe(container)).violations.map((v) => v.id)).toEqual([]);
  });
});
