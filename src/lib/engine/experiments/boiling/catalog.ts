/** 끓는점 측정 — 카탈로그 (클라이언트 허용: 블록·용품 종류·규칙·예측 선택지. 물성 수치 없음) */
import type { ExperimentCatalog, PredictionTarget, VariableOption } from "../types";
import type { ActionBlockDef, ItemDef, Step } from "../../types";
import { initialBoilingState, reduceBoiling, type BoilingState } from "./reducer";

const eqIn = (s: Step, i: number): string | null => {
  const v = s.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};
const qIn = (s: Step, i: number): number | null => {
  const v = s.slots[i];
  return v && v.kind === "quant" ? v.value : null;
};
const LIQUIDS = ["water", "ethanol"];

/** 한 시도에서 끓는점을 잰 액체 (그래프 블록 → 측정 블록 순으로 찾는다) */
const liquidOf = (trial: Step[]): string | null => {
  const fromBlock = (action: string): string | null =>
    trial.filter((s) => s.action === action).map((s) => eqIn(s, 0)).find((x) => x !== null && LIQUIDS.includes(x)) ?? null;
  return fromBlock("a11") ?? fromBlock("a9");
};

/** 에탄올이면 가지 달린 시험관, 물이면 비커에 넣은 양(mL) */
const amountOf = (trial: Step[]): number | null => {
  const liq = liquidOf(trial);
  if (!liq) return null;
  const container = liq === "ethanol" ? "side_arm_tube" : "beaker";
  const fills = trial.filter((s) => s.action === "a1" && eqIn(s, 0) === container && eqIn(s, 1) === liq);
  if (fills.length === 0) return null;
  return fills.reduce((sum, s) => sum + (qIn(s, 2) ?? 0), 0);
};

const methodOf = (trial: Step[]): string | null => {
  if (!trial.some((s) => s.action === "a8")) return null;
  return trial.some((s) => s.action === "a1" && eqIn(s, 0) === "side_arm_tube") ? "bath" : "direct";
};

const variableOptions: VariableOption[] = [
  { id: "liquid_type", label: "액체의 종류", roles: ["independent", "controlled"], extract: liquidOf },
  { id: "liquid_amount", label: "액체의 양", roles: ["controlled", "independent"], extract: amountOf },
  { id: "heat_method", label: "가열 방법(직접 가열·물중탕)", roles: ["controlled"], extract: methodOf },
  { id: "heat_strength", label: "핫플레이트의 가열 세기", roles: ["controlled"], extract: (t) => (t.some((s) => s.action === "a8") ? "hot_plate" : null) },
  { id: "boiling_point", label: "끓는점(그래프의 평평한 구간 온도)", roles: ["dependent"] },
  { id: "boil_start_time", label: "끓기 시작할 때까지 걸린 시간", roles: ["dependent"] },
  { id: "g_water", label: "물", roles: ["group"] },
  { id: "g_ethanol", label: "에탄올", roles: ["group"] },
  { id: "g_water_10", label: "물 10 mL", roles: ["group"] },
  { id: "g_water_20", label: "물 20 mL", roles: ["group"] },
  { id: "m_time_temp_graph", label: "일정 시간마다 온도를 재서 시간–온도 그래프의 평평한 구간 읽기", roles: ["method"] },
  { id: "m_bath_vapour", label: "에탄올은 물중탕 가열 + 증기를 찬물 속 빈 시험관에 모으기", roles: ["method"] },
  { id: "m_first_bubble", label: "처음 기포가 보이는 순간의 온도만 한 번 읽기", roles: ["method"] },
];

const ITEMS: ItemDef[] = [
  { id: "water", label: "물", icon: "💧", kind: "liquid" },
  { id: "ethanol", label: "에탄올", icon: "🧴", kind: "liquid" },
  { id: "beaker", label: "비커", icon: "🫙", kind: "container" },
  { id: "side_arm_tube", label: "가지 달린 시험관", icon: "🧪", kind: "container" },
  { id: "empty_tube", label: "빈 시험관", icon: "🧪", kind: "container" },
  { id: "cold_water_beaker", label: "찬물 비커", icon: "🧊", kind: "container" },
  { id: "hot_plate", label: "핫플레이트", icon: "🔥", kind: "heater" },
  { id: "stand", label: "스탠드", icon: "🏗️", kind: "tool" },
  { id: "thermometer", label: "온도계", icon: "🌡️", kind: "thermometer" },
  { id: "stopper_thermometer", label: "온도계 꽂은 마개", icon: "🔘", kind: "thermometer" },
  { id: "rubber_tube", label: "고무관", icon: "〰️", kind: "tube" },
  { id: "glass_tube", label: "유리관", icon: "📏", kind: "tube" },
];

const ACTIONS: ActionBlockDef[] = [
  { id: "a1", text: "(  )에 (  )을(를) (  ) 넣는다", slots: [{ accepts: "equip" }, { accepts: "equip" }, { accepts: "quant", units: ["mL"] }] },
  { id: "a2", text: "(  )을(를) (  ) 위에 올린다", slots: [{ accepts: "equip" }, { accepts: "equip" }], guideline: ["2.2"] },
  { id: "a3", text: "(  )을(를) 스탠드에 고정한다", slots: [{ accepts: "equip" }] },
  { id: "a4", text: "(  )의 입구를 (  )(으)로 막는다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
  { id: "a5", text: "온도계 끝이 (  )의 한가운데에 오도록 높이를 조절한다", slots: [{ accepts: "equip" }] },
  { id: "a6", text: "(  )에 (  )을(를) 연결한다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
  { id: "a7", text: "(  )을(를) (  ) 속에 넣는다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
  { id: "a8", text: "핫플레이트를 켜서 가열을 시작한다", slots: [], guideline: ["2.2"] },
  { id: "a9", text: "(  )이(가) 끓을 때까지 (  )마다 온도를 측정한다", slots: [{ accepts: "equip" }, { accepts: "quant", units: ["s", "min"] }] },
  { id: "a10", text: "끓기 시작한 뒤 (  ) 동안 온도를 더 측정하여 기록한다", slots: [{ accepts: "quant", units: ["s", "min"] }] },
  { id: "a11", text: "시간에 따른 온도 변화를 그래프로 그려 (  )의 끓는점을 찾는다", slots: [{ accepts: "equip" }] },
];

const PREDICTIONS: PredictionTarget[] = [
  {
    id: "graph_while_boiling",
    question: "액체가 끓는 동안 계속 가열하면 시간–온도 그래프는 어떤 모양일까요?",
    choices: [
      { id: "flat", label: "온도가 더 오르지 않고 평평하게 유지된다" },
      { id: "rising", label: "온도가 같은 빠르기로 계속 올라간다" },
      { id: "falling", label: "끓기 시작하면 온도가 내려간다" },
    ],
    sketch: { xMax: 600, yMin: 0, yMax: 140, points: 9 },
    hints: [
      "주전자의 물이 펄펄 끓을 때, 불을 더 세게 하면 물의 온도는 어떻게 될지 떠올려 볼까요?",
      "끓는 동안 가한 열은 어디에 쓰일까요? 액체가 기체로 변하는 데도 에너지가 필요해요.",
      "열이 온도를 올리는 데 쓰이지 않는 동안 그래프의 높이는 어떻게 그려질지 생각해 보세요.",
    ],
  },
  {
    id: "amount_or_heat_bp",
    question: "물의 양을 10 mL에서 20 mL로 늘리거나 더 세게 가열하면, 물의 끓는점은 어떻게 될까요?",
    choices: [
      { id: "same", label: "끓는점은 같다 (끓기 시작하는 시간만 달라질 수 있다)" },
      { id: "higher", label: "양이 많거나 세게 가열하면 끓는점이 높아진다" },
      { id: "lower", label: "양이 많거나 세게 가열하면 끓는점이 낮아진다" },
    ],
    hints: [
      "'끓기 시작하는 데 걸리는 시간'과 '끓을 때의 온도'는 같은 것일까요?",
      "물이 많으면 데우는 데 시간이 더 걸려요. 그렇다면 끓을 때의 온도까지 달라질까요?",
      "밀도처럼 물질의 양과 상관없이 일정한 성질을 '물질의 특성'이라고 해요. 끓는점도 그럴지 생각해 보세요.",
    ],
  },
];

export const boilingCatalog: ExperimentCatalog<BoilingState> = {
  slug: "boiling",
  title: "끓는점 측정",
  standards: ["9과08-01"],
  goal: "액체의 종류에 따른 끓는점의 변화를 비교하여 설명할 수 있다.",
  scene: "boiling",
  items: ITEMS,
  quants: [
    { unit: "mL", label: "mL (밀리리터)" },
    { unit: "s", label: "초" },
    { unit: "min", label: "분" },
    { unit: "°C", label: "℃ (도씨)" },
    { unit: "g", label: "g (그램)" },
  ],
  positions: [],
  actions: ACTIONS,
  variableOptions,
  exampleSteps: [
    "비커에 물을 10mL 넣는다",
    "비커를 핫플레이트 위에 올린다",
    "온도계를 스탠드에 고정한다",
  ],
  predictionTargets: PREDICTIONS,
  requiredSubjects: ["water", "ethanol"],
  initialState: initialBoilingState,
  reduce: reduceBoiling,
  isTrialEnd: (s) => s.action === "a11",
};

export const BOILING_LIQUIDS = LIQUIDS;
