/**
 * 카탈로그 → Blockly 블록 JSON 정의 (지침 2.1·2.2).
 * 문장형 행동 블록의 "(  )" 자리마다 값 입력을 두고, 끼울 수 있는 블록 종류를 check로 제한한다.
 * 절차 블록은 statement 타입 "proc", 변인 블록은 "design"으로 분리해 섞이지 않게 한다.
 */
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { ActionBlockDef, ItemDef, PosDef, QuantDef, Unit } from "@/lib/engine/types";
import { VARIABLE_BLOCKS } from "@/lib/engine/dsl/variableBlocks";

export const HUE = { design: 270, equip: 25, quant: 160, pos: 195, action: 215, hat: 330 } as const;

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
    { type: T.designStart, message0: "🔬 변인 설계", nextStatement: "design", colour: HUE.hat, tooltip: "무엇을 바꾸고, 무엇을 재고, 무엇을 같게 할지 정해요", deletable: false },
    { type: T.procStart, message0: "🧪 실험 절차", nextStatement: "proc", colour: HUE.hat, tooltip: "실험 순서대로 행동 블록을 아래에 이어 붙여요", deletable: false },
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
    colour: HUE.action,
    tooltip: def.text.replace(/\(\s+\)/g, "□"),
  };
}

export function itemBlock(slug: string, item: ItemDef): BlockJson {
  return { type: T.item(slug, item.id), message0: `${item.icon} ${item.label}`, output: "equip", colour: HUE.equip, tooltip: item.label };
}

export function quantBlock(q: QuantDef): BlockJson {
  return {
    type: T.quant(q.unit),
    message0: `%1 ${q.unit}`,
    args0: [{ type: "field_number", name: "VALUE", value: 0, min: 0, precision: 0.1 }],
    output: "quant",
    colour: HUE.quant,
    tooltip: q.label,
  };
}

export function posBlock(slug: string, pos: PosDef): BlockJson {
  return { type: T.pos(slug, pos.id), message0: `📍 ${pos.label}`, output: "pos", colour: HUE.pos };
}

export function variableBlocks(catalog: AnyCatalog): BlockJson[] {
  return VARIABLE_BLOCKS.map((vb) => {
    const roleKey = vb.role.endsWith("_group") ? "group" : vb.role;
    const opts = catalog.variableOptions.filter((o) => o.roles.includes(roleKey as never));
    const options = [["골라 주세요", "__none"], ...opts.map((o) => [o.label, o.id])];
    return {
      type: T.variable(catalog.slug, vb.role),
      message0: `${vb.label} %1 %2 이유: %3`,
      args0: [
        { type: "input_dummy" },
        { type: "field_dropdown", name: "OPTION", options },
        { type: "field_input", name: "WHY", text: "" },
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
    { name: "변인 설계", colour: String(HUE.design), types: VARIABLE_BLOCKS.map((v) => T.variable(catalog.slug, v.role)) },
    { name: "준비물", colour: String(HUE.equip), types: catalog.items.map((i: ItemDef) => T.item(catalog.slug, i.id)) },
    { name: "용량/수치", colour: String(HUE.quant), types: catalog.quants.map((q: QuantDef) => T.quant(q.unit)) },
    { name: "위치", colour: String(HUE.pos), types: catalog.positions.map((p: PosDef) => T.pos(catalog.slug, p.id)) },
    { name: "행동", colour: String(HUE.action), types: catalog.actions.map((a: ActionBlockDef) => T.action(catalog.slug, a.id)) },
  ].filter((c) => c.types.length > 0);
  return {
    kind: "categoryToolbox",
    contents: cats.map((c) => ({ kind: "category", name: c.name, colour: c.colour, contents: blocks(c.types) })),
  };
}
