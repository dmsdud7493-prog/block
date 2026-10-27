/** 녹는점 리듀서 공용 결과 생성기 — 오류(격려형 문구)·이벤트(장면 상태 포함) */
import type { StepOutcome } from "../../types";
import { fixJosa } from "../../format";
import { initialMeltingState, type MeltingState } from "./model";

export type Out = StepOutcome<MeltingState> & { endTrial?: boolean };

export const fail = (s: MeltingState, code: string, message: string): Out => ({
  state: s,
  error: { code, message: fixJosa(message) },
});

/** 장면(SVG)용 공통 상태 요약 */
export function sceneOf(s: MeltingState): Record<string, unknown> {
  return {
    temp: s.temp,
    solid: s.solid,
    heating: s.heating,
    assembled: {
      water: s.bkr.water,
      beakerOnHotPlate: s.bkr.onHot,
      sampleInTube: s.tube.sub !== null,
      tubeFixed: s.tube.fixed,
      thermometerIn: s.thermo.in,
      thermometerCentered: s.thermo.adjusted,
    },
  };
}

export const ok = (state: MeltingState, type: string, note: string, extra: Record<string, unknown> = {}): Out => ({
  state,
  event: { type, note: fixJosa(note), ...extra, ...sceneOf(state) },
});

export const freshAfterGraph = (s: MeltingState): MeltingState => ({
  ...initialMeltingState(),
  lastGraph: s.run ? { sub: s.run.sub, seriesKey: s.run.seriesKey } : null,
});
