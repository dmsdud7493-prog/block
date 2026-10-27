import { describe, expect, it } from "vitest";
import { fixJosa } from "@/lib/engine/format";

describe("fixJosa", () => {
  it.each([
    ["물을(를) 붓는다", "물을 붓는다"],
    ["눈금실린더을(를) 올린다", "눈금실린더를 올린다"],
    ["황산 구리(II)을(를) 넣는다", "황산 구리(II)를 넣는다"],
    ["질산 칼륨이(가) 녹는다", "질산 칼륨이 녹는다"],
    ["비커(으)로 옮겼어요", "비커로 옮겼어요"],
    ["눈금실린더에서 물(으)로", "눈금실린더에서 물로"],
    ["시험관(으)로", "시험관으로"],
  ])("%s → %s", (input, out) => expect(fixJosa(input)).toBe(out));
});
