/** 밀도 측정 — 카탈로그 (클라이언트 허용: 블록·용품 종류·규칙·예측 선택지. 물성 수치 없음) */
import type { ExperimentCatalog, PredictionTarget, VariableOption } from "../types";
import type { ActionBlockDef, ItemDef, Step } from "../../types";
import { reduceDensity, initialDensityState, type DensityState } from "./reducer";

const eqIn = (s: Step, i: number): string | null => {
  const v = s.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};
const qIn = (s: Step, i: number): number | null => {
  const v = s.slots[i];
  return v && v.kind === "quant" ? v.value : null;
};
const SOLIDS = ["iron_big", "iron_small"];
const LIQUIDS = ["water", "oil"];

/** 한 시도에서 질량을 잰 물질 */
const subjectOf = (trial: Step[]): string | null =>
  trial.filter((s) => s.action === "a4").map((s) => eqIn(s, 0)).find((x) => x !== null) ?? null;

const pouredVolume = (trial: Step[]): number | null => {
  const pours = trial.filter((s) => s.action === "a2" || s.action === "a6");
  const first = pours[0];
  if (!first) return null;
  return first.action === "a2" ? qIn(first, 1) : qIn(first, 2);
};

const variableOptions: VariableOption[] = [
  { id: "material", label: "물질의 종류", roles: ["independent"], extract: subjectOf },
  { id: "iron_size", label: "철조각의 크기", roles: ["independent"], extract: (t) => { const s = subjectOf(t); return s && SOLIDS.includes(s) ? s : null; } },
  { id: "liquid_volume", label: "붓는 액체(물)의 양", roles: ["controlled", "independent"], extract: pouredVolume },
  { id: "container", label: "측정 용기(눈금실린더)", roles: ["controlled"], extract: () => "cylinder" },
  { id: "density", label: "밀도(질량÷부피)", roles: ["dependent"] },
  { id: "mass", label: "질량", roles: ["dependent"] },
  { id: "volume", label: "부피", roles: ["dependent"] },
  { id: "g_iron_big", label: "큰 철조각", roles: ["group"] },
  { id: "g_iron_small", label: "작은 철조각", roles: ["group"] },
  { id: "g_water", label: "물", roles: ["group"] },
  { id: "g_oil", label: "식용유", roles: ["group"] },
  { id: "m_scale_cylinder", label: "전자저울(질량) + 눈금실린더(부피)", roles: ["method"] },
  { id: "m_ruler", label: "자로 가로·세로·높이 재기", roles: ["method"] },
];


const target = (id: string, question: string, choices: [string, string][], hints: [string, string, string]): PredictionTarget => ({
  id, question, hints, choices: choices.map(([cid, label]) => ({ id: cid, label })),
});

const PREDICTIONS: PredictionTarget[] = [
  target("same_density", "큰 철조각과 작은 철조각의 밀도는 어떨까요?",
    [["same", "두 철조각의 밀도는 같다"], ["big", "큰 철조각의 밀도가 더 크다"], ["small", "작은 철조각의 밀도가 더 크다"]],
    [
      "밀도는 '얼마나 빽빽한가'예요. 크기와 빽빽함은 같은 걸까요?",
      "같은 철을 반으로 자르면 질량과 부피가 각각 어떻게 될까요?",
      "물 한 컵과 물 두 컵은 끓는점이 같아요. 양이 달라도 변하지 않는 성질을 떠올려 보세요.",
    ]),

  target("float_sink", "물·식용유·철조각을 한 비커에 넣으면 어떻게 자리 잡을까요?",
    [["iron_water_oil", "아래부터 철조각 → 물 → 식용유"], ["oil_water_iron", "아래부터 식용유 → 물 → 철조각"], ["mixed", "모두 고르게 섞인다"]],
    [
      "국에 뜬 기름은 위에 있나요, 아래에 있나요?",
      "밀도가 큰 물질과 작은 물질 중 어느 쪽이 가라앉을까요?",
      "측정한 값을 떠올려 밀도가 큰 순서로 아래에서부터 쌓아 보세요.",
    ]),
];

const ACTIONS: ActionBlockDef[] = [
  { id: "a1", text: "(  )을(를) (  )에 올린 다음, 영점조정을 한다", slots: [{ accepts: "equip" }, { accepts: "equip" }], guideline: ["2.2"] },
  { id: "a2", text: "(  )을(를) (  )만큼 눈금실린더에 붓는다", slots: [{ accepts: "equip" }, { accepts: "quant", units: ["mL"] }] },
  { id: "a3", text: "(  )의 부피를 측정한다", slots: [{ accepts: "equip" }] },
  { id: "a4", text: "(  )의 질량을 측정한다", slots: [{ accepts: "equip" }] },
  { id: "a5", text: "측정한 물질의 질량을 부피로 나눈 값을 계산한다", slots: [] },
  { id: "a6", text: "(  )에 (  )을(를) (  ) 넣는다", slots: [{ accepts: "equip" }, { accepts: "equip" }, { accepts: "quant", units: ["mL"] }] },
  { id: "a7", text: "(  )을(를) (  )에 넣는다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
  { id: "a8", text: "(  )의 부피변화를 측정한다", slots: [{ accepts: "equip" }] },
];

const ITEMS: ItemDef[] = [
  { id: "water", label: "물", icon: "💧", kind: "liquid" },
  { id: "oil", label: "식용유", icon: "🛢️", kind: "liquid" },
  { id: "iron_big", label: "큰 철조각", icon: "⬛", kind: "solid" },
  { id: "iron_small", label: "작은 철조각", icon: "▪️", kind: "solid" },
  { id: "cylinder", label: "눈금실린더", icon: "🧪", kind: "container" },
  { id: "beaker", label: "비커", icon: "🫙", kind: "container" },
  { id: "tweezers", label: "핀셋", icon: "🥢", kind: "tool" },
  { id: "scale", label: "전자저울", icon: "⚖️", kind: "scale" },
  { id: "thread", label: "실", icon: "🧵", kind: "tool" },
];

export const densityCatalog: ExperimentCatalog<DensityState> = {
  slug: "density",
  title: "밀도 측정",
  standards: ["9과08-01"],
  goal: "여러 물질의 질량과 부피를 측정해 밀도를 구하고, 밀도가 물질의 특성임을 설명할 수 있다.",
  scene: "density",
  items: ITEMS,
  quants: [
    { unit: "g", label: "g (그램)" },
    { unit: "mL", label: "mL (밀리리터)" },
    { unit: "cm", label: "cm (센티미터)" },
    { unit: "s", label: "초" },
  ],
  positions: [],
  actions: ACTIONS,
  variableOptions,
  exampleSteps: [
    "눈금실린더를 전자저울에 올린 다음, 영점조정을 한다",
    "물을 50mL만큼 눈금실린더에 붓는다",
    "물의 부피를 측정한다",
  ],
  predictionTargets: PREDICTIONS,
  requiredSubjects: ["water", "oil", "iron_big", "iron_small"],
  initialState: initialDensityState,
  reduce: reduceDensity,
  isTrialEnd: (s) => s.action === "a5",
};

export const DENSITY_LIQUIDS = LIQUIDS;
export const DENSITY_SOLIDS = SOLIDS;
