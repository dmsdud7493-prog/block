/** 보고서 과정 번호 통일(2026-11-21) — 11번째부터 모양이 달라지지 않는다 */
import { describe, expect, it } from "vitest";
import { splitStep, stepMark, unifyMarks } from "@/lib/report/marks";
import { activitiesOf } from "@/lib/report/activities";
import { CATALOGS } from "@/lib/engine/experiments";
import { initialLabState } from "@/components/lab/state";
import type { LabState } from "@/components/lab/types";

describe("stepMark", () => {
  it("몇 번째든 같은 모양(숫자와 점)이다", () => {
    expect([0, 9, 10, 11, 29].map(stepMark)).toEqual(["1.", "10.", "11.", "12.", "30."]);
  });
});

describe("unifyMarks", () => {
  it("예전 번호(➊… 11.)를 같은 모양으로 바꾼다", () => {
    expect(unifyMarks("➊ 붓는다\n➓ 거른다\n11. 말린다")).toBe("1. 붓는다\n10. 거른다\n11. 말린다");
    expect(unifyMarks("① 붓는다\n⑪ 말린다")).toBe("1. 붓는다\n11. 말린다");
  });
  it("번호가 없는 글·빈 글·줄 가운데 숫자는 그대로 둔다", () => {
    expect(unifyMarks("내가 쓴 글\n\n물 11.5 g")).toBe("내가 쓴 글\n\n물 11.5 g");
    expect(unifyMarks("")).toBe("");
  });
  it("다시 바꿔도 같다", () => {
    const once = unifyMarks("➊ 가\n11. 나");
    expect(unifyMarks(once)).toBe(once);
  });
});

describe("splitStep", () => {
  it("번호와 내용을 나눈다(예전 번호도)", () => {
    expect(splitStep("11. 거름종이를 말린다")).toEqual({ n: 11, text: "거름종이를 말린다" });
    expect(splitStep("➌ 물을 붓는다")).toEqual({ n: 3, text: "물을 붓는다" });
    expect(splitStep("물 11.5 g을 넣었다")).toEqual({ n: null, text: "물 11.5 g을 넣었다" });
  });
});

describe("6개 실험 모두", () => {
  it.each(Object.keys(CATALOGS))("%s: 과정 초안의 모든 줄이 '숫자. '로 시작한다", (slug) => {
    const lines = activitiesOf(CATALOGS[slug], initialLabState(slug) as LabState).flatMap((a) => a.steps.split("\n")).filter(Boolean);
    expect(lines.every((l) => /^\d+\. /.test(l))).toBe(true);
  });
});
