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

export function actionBlock(slug: string, def: ActionBlockDef): BlockJson {
  const parts = def.text.split("(  )");
  const message = parts.reduce((acc, p, i) => (i === 0 ? p : `${acc}%${i}${p}`), "");
  const args = def.slots.map((s, i) => ({ type: "input_value", name: `S${i}`, check: s.accepts }));
  return {
    type: T.action(slug, def.id),
    message0: message.trim() || def.text,
    args0: args,
    inputsInline: true,
    previousStatement: "proc",
    nextStatement: "proc",
    style: STYLE.action,
    tooltip: def.text.replace(/\(\s+\)/g, "□"),
  };
}

export function itemBlock(slug: string, item: ItemDef): BlockJson {
  return { type: T.item(slug, item.id), message0: `${item.icon} ${item.label}`, output: "equip", style: STYLE.equip, tooltip: item.label };
}

export function quantBlock(q: QuantDef): BlockJson {
  return {
    type: T.quant(q.unit),
    message0: `%1 ${q.unit}`,
    args0: [{ type: "field_number", name: "VALUE", value: 0, min: 0, precision: 0.1 }],
    output: "quant",
    style: STYLE.quant,
    tooltip: q.label,
  };
}

export function posBlock(slug: string, pos: PosDef): BlockJson {
  return { type: T.pos(slug, pos.id), message0: `📍 ${pos.label}`, output: "pos", style: STYLE.pos };
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
