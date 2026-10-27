/** E2E용 Blockly 작업 공간 JSON 빌더 (BlocklyWorkspace의 __labLoad로 불러온다) */
type J = Record<string, unknown>;

export const item = (slug: string, id: string): J => ({ block: { type: `item_${slug}_${id}` } });
export const qty = (unit: string, value: number): J => ({ block: { type: `quant_${encodeURIComponent(unit).replace(/%/g, "_")}`, fields: { VALUE: value } } });

export interface ActionSpec { action: string; inputs?: J[]; id?: string }
export interface VarSpec { role: string; option: string; why?: string }

function chainActions(slug: string, specs: ActionSpec[]): J | undefined {
  if (specs.length === 0) return undefined;
  const [head, ...rest] = specs;
  const inputs = Object.fromEntries((head.inputs ?? []).map((v, i) => [`S${i}`, v]));
  const next = chainActions(slug, rest);
  return { block: { type: `act_${slug}_${head.action}`, ...(head.id ? { id: head.id } : {}), inputs, ...(next ? { next } : {}) } };
}

function chainVars(slug: string, vars: VarSpec[]): J | undefined {
  if (vars.length === 0) return undefined;
  const [head, ...rest] = vars;
  const next = chainVars(slug, rest);
  return { block: { type: `var_${slug}_${head.role}`, fields: { OPTION: head.option, WHY: head.why ?? "" }, ...(next ? { next } : {}) } };
}

export function workspace(slug: string, steps: ActionSpec[], vars: VarSpec[] = []): J {
  const design = chainVars(slug, vars);
  const proc = chainActions(slug, steps);
  return {
    blocks: {
      languageVersion: 0,
      blocks: [
        { type: "design_start", x: 24, y: 24, deletable: false, ...(design ? { next: design } : {}) },
        { type: "proc_start", x: 24, y: 260, deletable: false, ...(proc ? { next: proc } : {}) },
      ],
    },
  };
}
