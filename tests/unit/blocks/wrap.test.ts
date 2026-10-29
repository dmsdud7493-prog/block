/** 행동 블록 자동 줄바꿈 — 빈칸 이름·순서 유지, 줄바꿈 입력에는 글자가 없고, 폭에 따라 접혔다 펴진다 */
import { describe, expect, it } from "vitest";
import * as Blockly from "blockly/core";
import { actionBlock, allBlockJson, T } from "@/lib/blocks/blockTypes";
import { layoutAction, MAX_ROW, registerAutoWrap } from "@/lib/blocks/autoWrap";
import { CATALOGS } from "@/lib/engine/experiments";

type Arg = { type: string; name: string };
const all = Object.values(CATALOGS).flatMap((c) => c!.actions.map((a) => ({ slug: c!.slug, a })));

registerAutoWrap();
Object.values(CATALOGS).forEach((c) => Blockly.common.defineBlocksWithJsonArray(allBlockJson(c!)));

describe("행동 블록 정의", () => {
  it.each(all.map(({ slug, a }) => [`${slug}/${a.id}`, slug, a] as const))("%s: 빈칸 이름·순서 유지, 모든 입력이 문장에 있다", (_n, slug, a) => {
    const json = actionBlock(slug, a) as { args0: Arg[]; message0: string };
    expect(json.args0.filter((x) => x.type === "input_value").map((x) => x.name)).toEqual(a.slots.map((_s, i) => `S${i}`));
    json.args0.forEach((_x, i) => expect(json.message0).toContain(`%${i + 1}`));
  });
});

describe("자동 줄바꿈", () => {
  const ws = new Blockly.Workspace();
  it.each(all.map(({ slug, a }) => [`${slug}/${a.id}`, slug, a] as const))("%s: 줄바꿈 입력에는 글자가 없어 숨겨도 문장이 그대로", (_n, slug, a) => {
    const b = ws.newBlock(T.action(slug, a.id));
    const breaks = b.inputList.filter((i) => i.name.startsWith("BR"));
    breaks.forEach((br) => expect(br.fieldRow).toHaveLength(0));
    const text = b.inputList.flatMap((i) => i.fieldRow.map((f) => f.getText())).join("");
    expect(text.replace(/\s/g, "")).toBe(a.text.replace(/\(\s+\)/g, "").replace(/\s/g, ""));
  });
  it("긴 블록은 접히고 짧은 블록은 한 줄", () => {
    const long = all.find(({ a }) => a.text.replace(/\(\s+\)/g, "____").length > 30)!;
    const b = ws.newBlock(T.action(long.slug, long.a.id));
    layoutAction(b);
    expect(b.inputList.some((i) => i.name.startsWith("BR") && i.isVisible())).toBe(true);
    const short = all.find(({ a }) => a.text.replace(/\(\s+\)/g, "____").length <= 14)!;
    const s = ws.newBlock(T.action(short.slug, short.a.id));
    layoutAction(s);
    expect(s.inputList.some((i) => i.name.startsWith("BR") && i.isVisible())).toBe(false);
    expect(MAX_ROW).toBeGreaterThan(200);
  });
});
