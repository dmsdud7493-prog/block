/** 재결정 실험 용해도 표 (물 100 g에 녹는 최대 질량, g) — 프로토타입 SOL 표. 교과서 자료라 학생 화면에 공개한다. */
import type { ReferenceTable } from "../../types";
import { SOL_GRID, type Solute } from "./model";

export const SOL_TABLE: Record<Solute, number[]> = {
  boric_acid: [2.5, 3.5, 4.7, 6.2, 8.1, 10.3, 13.0, 15.8, 19.1, 23.0, 27.5],
  cuso4: [14.3, 17.4, 20.7, 25.0, 28.5, 33.3, 40.0, 47.0, 55.0, 64.0, 75.0],
};

export const SOLUBILITY_REFERENCE: ReferenceTable = {
  title: "온도에 따른 용해도 (물 100 g에 녹는 최대 질량, g)",
  caption: "석출량 = 넣은 양 − (식힌 온도의 용해도 × 물의 양 ÷ 100)",
  columns: ["온도(°C)", ...SOL_GRID.map(String)],
  rows: [["붕산", ...SOL_TABLE.boric_acid], ["황산 구리(II)", ...SOL_TABLE.cuso4]],
};
