/** 긴 행동 블록은 두 줄로 접어 폭을 줄인다 — 빈칸(S0..) 이름과 순서는 그대로 */
import { describe, expect, it } from "vitest";
import { actionBlock } from "@/lib/blocks/blockTypes";
import { CATALOGS } from "@/lib/engine/experiments";

type Arg = { type: string; name: string };

describe("행동 블록 줄바꿈", () => {
  const all = Object.values(CATALOGS).flatMap((c) => c!.actions.map((a) => ({ slug: c!.slug, a })));
  it.each(all.map(({ slug, a }) => [`${slug}/${a.id}`, slug, a] as const))("%s: 빈칸 이름·순서 유지, 줄바꿈은 최대 1번", (_n, slug, a) => {
    const json = actionBlock(slug, a) as { args0: Arg[]; message0: string };
    const slots = json.args0.filter((x) => x.type === "input_value").map((x) => x.name);
    expect(slots).toEqual(a.slots.map((_s, i) => `S${i}`));
    expect(json.args0.filter((x) => x.type === "input_end_row").length).toBeLessThanOrEqual(1);
    json.args0.forEach((_x, i) => expect(json.message0).toContain(`%${i + 1}`));
  });
  it("짧은 문장은 접지 않고, 긴 문장은 접는다", () => {
    const short = all.find(({ a }) => a.text.replace(/\(\s+\)/g, "____").length <= 18)!;
    const long = all.find(({ a }) => a.text.replace(/\(\s+\)/g, "____").length > 30)!;
    expect(JSON.stringify(actionBlock(short.slug, short.a))).not.toContain("input_end_row");
    expect(JSON.stringify(actionBlock(long.slug, long.a))).toContain("input_end_row");
  });
});
