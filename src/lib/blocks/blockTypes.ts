/**
 * 카탈로그 → Blockly 블록 JSON 정의 (지침 2.1·2.2).
 * 문장형 행동 블록의 "(  )" 자리마다 값 입력을 두고, 끼울 수 있는 블록 종류를 check로 제한한다.
 * 절차 블록은 statement 타입 "proc", 변인 블록은 "design"으로 분리해 섞이지 않게 한다.
 */
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { ActionBlockDef, ItemDef, PosDef, QuantDef, Unit } from "@/lib/engine/types";
import { TOOLBOX_VARIABLE_BLOCKS, VARIABLE_BLOCKS } from "@/lib/engine/dsl/variableBlocks";

export const HUE = { design: 270, equip: 25, quant: 160, pos: 195, action: 215, hat: 330 } as const;

/** 블록 스타일 이름 — 색은 테마(`components/blocks/theme.ts`)가 정한다. 원래 프로토타입 색: 준비물 하늘·수치 분홍·행동 노랑 */
export const STYLE = { hat: "hat_blocks", equip: "equip_blocks", quant: "quant_blocks", pos: "pos_blocks", action: "action_blocks" } as const;

export const T = {
  procStart: "proc_start",
  designStart: "design_start",
  action: (slug: string, id: string) => `act_${slug}_${id}`,
  item: (slug: string, id: string) => `item_${slug}_${id}`,
  quant: (unit: Unit) => `quant_${encodeURIComponent(unit).replace(/%/g, "_")}`,
  pos: (slug: string, id: string) => `pos_${slug}_${id}`,
  variable: (slug: string, role: string) => `var_${slug}_${role}`,
};

export type BlockJson = Record<string, unknown>;

export function hatBlocks(): BlockJson[] {
  return [
    { type: T.designStart, message0: "🔬 실험 계획 세우기", nextStatement: "design", style: STYLE.hat, tooltip: "무엇을 바꿔 보고, 무엇을 재고, 무엇을 똑같이 맞출지 아래에 블록으로 정해요", deletable: false },
    { type: T.procStart, message0: "🧪 실험 절차", nextStatement: "proc", style: STYLE.hat, tooltip: "실험 순서대로 행동 블록을 아래에 이어 붙여요", deletable: false },
  ];
}

/**
 * 행동 블록 줄바꿈 후보 — 빈칸 뒤와 긴 글귀의 가운데 띄어쓰기에 숨은 줄바꿈 입력(BRn)을 넣어 둔다.
 * 실제로 어디서 접을지는 `autoWrap.ts`가 끼운 블록 폭을 재서 정한다(블록 폭이 고르게 유지되도록).
 * 줄바꿈 입력에는 글자를 붙이지 않는다(숨겨도 글자가 사라지지 않게) — 글귀를 나눌 때는 앞부분을 빈 입력(TXn)에 단다.
 */
const SPLIT_TEXT_AT = 10;

type Token = { kind: "text"; text: string } | { kind: "slot"; index: number } | { kind: "dummy" } | { kind: "br" };

function midSpace(text: string): number {
  const half = text.length / 2;
  return [...text].reduce((best, ch, j) => (ch === " " && j > 0 && j < text.length - 1 && (best < 0 || Math.abs(j - half) < Math.abs(best - half)) ? j : best), -1);
}

function textTokens(text: string): Token[] {
  const at = text.trim().length > SPLIT_TEXT_AT ? midSpace(text) : -1;
  if (at < 0) return text ? [{ kind: "text", text }] : [];
  return [{ kind: "text", text: text.slice(0, at) }, { kind: "dummy" }, { kind: "br" }, { kind: "text", text: text.slice(at + 1) }];
}

export function actionTokens(def: ActionBlockDef): Token[] {
  const parts = def.text.split("(  )");
  return parts.flatMap((p, i): Token[] => {
    const lead: Token[] = i === 0 ? [] : [{ kind: "slot", index: i - 1 }, ...(p.trim() ? [{ kind: "br" } as Token] : [])];
    return [...lead, ...textTokens(p)];
  });
}

export function actionBlock(slug: string, def: ActionBlockDef): BlockJson {
  const tokens = actionTokens(def);
  const inputs = tokens.filter((t) => t.kind !== "text");
  const argOf = (t: Token, i: number): BlockJson =>
    t.kind === "slot" ? { type: "input_value", name: `S${t.index}`, check: def.slots[t.index].accepts }
      : t.kind === "br" ? { type: "input_end_row", name: `BR${i + 1}` }
        : { type: "input_dummy", name: `TX${i + 1}` };
  const message = tokens.map((t) => (t.kind === "text" ? t.text : `%${inputs.indexOf(t) + 1}`)).join("");
  return {
    type: T.action(slug, def.id),
    message0: message.trim() || def.text,
    args0: inputs.map(argOf),
    inputsInline: true,
    previousStatement: "proc",
    nextStatement: "proc",
    style: STYLE.action,
    tooltip: def.text.replace(/\(\s+\)/g, "□"),
    extensions: ["lab_autowrap"],
  };
}

export function itemBlock(slug: string, item: ItemDef): BlockJson {
  return { type: T.item(slug, item.id), message0: `${item.icon} ${item.label}`, output: "equip", style: STYLE.equip, tooltip: item.label, extensions: ["lab_removable"] };
}

export function quantBlock(q: QuantDef): BlockJson {
  return {
    type: T.quant(q.unit),
    message0: `%1 ${q.unit}`,
    args0: [{ type: "field_number", name: "VALUE", value: 0, min: 0, precision: 0.1 }],
    output: "quant",
    style: STYLE.quant,
    extensions: ["lab_removable"],
    tooltip: q.label,
  };
}

export function posBlock(slug: string, pos: PosDef): BlockJson {
  return { type: T.pos(slug, pos.id), message0: `📍 ${pos.label}`, output: "pos", style: STYLE.pos, extensions: ["lab_removable"] };
}

export function variableBlocks(catalog: AnyCatalog): BlockJson[] {
  return VARIABLE_BLOCKS.map((vb) => {
    const roleKey = vb.role.endsWith("_group") ? "group" : vb.role;
    const opts = catalog.variableOptions.filter((o) => o.roles.includes(roleKey as never));
    const options = [["골라 주세요", "__none"], ...opts.map((o) => [o.label, o.id])];
    return {
      type: T.variable(catalog.slug, vb.role),
      // '왜?' 칸은 없앴다(사용자 결정 2026-10-29, ADR-P13) — 고른 까닭은 튜터 대화·보고서에서 설명한다
      message0: `${vb.icon} ${vb.easy} (${vb.term}) %1 %2`,
      args0: [
        { type: "input_dummy" },
        { type: "field_dropdown", name: "OPTION", options },
      ],
      previousStatement: "design",
      nextStatement: "design",
      colour: vb.color,
      tooltip: vb.help,
    };
  });
}

export function allBlockJson(catalog: AnyCatalog): BlockJson[] {
  return [
    ...hatBlocks(),
    ...catalog.actions.map((a: ActionBlockDef) => actionBlock(catalog.slug, a)),
    ...catalog.items.map((i: ItemDef) => itemBlock(catalog.slug, i)),
    ...catalog.quants.map((q: QuantDef) => quantBlock(q)),
    ...catalog.positions.map((p: PosDef) => posBlock(catalog.slug, p)),
    ...variableBlocks(catalog),
  ];
}

export function toolbox(catalog: AnyCatalog) {
  const blocks = (types: string[]) => types.map((type) => ({ kind: "block", type }));
  const cats = [
    { name: "실험 계획", key: "design", types: TOOLBOX_VARIABLE_BLOCKS.map((v) => T.variable(catalog.slug, v.role)) },
    { name: "준비물", key: "equip", types: catalog.items.map((i: ItemDef) => T.item(catalog.slug, i.id)) },
    { name: "용량/수치", key: "quant", types: catalog.quants.map((q: QuantDef) => T.quant(q.unit)) },
    { name: "위치", key: "pos", types: catalog.positions.map((p: PosDef) => T.pos(catalog.slug, p.id)) },
    { name: "행동", key: "action", types: catalog.actions.map((a: ActionBlockDef) => T.action(catalog.slug, a.id)) },
  ].filter((c) => c.types.length > 0);
  return {
    kind: "categoryToolbox",
        // cssConfig: 카테고리마다 색 동그라미를 그리기 위한 클래스 (globals.css .cat-*)
    contents: cats.map((c) => ({
      kind: "category", name: c.name, contents: blocks(c.types),
      cssConfig: { container: `blocklyToolboxCategoryContainer cat-${c.key}`, row: "blocklyToolboxCategory", icon: "blocklyToolboxCategoryIcon", label: "blocklyToolboxCategoryLabel" },
    })),
  };
}
