/** 끓는점 차를 이용한 혼합물 분리(물–에탄올) — 카탈로그 (클라이언트 허용: 블록·규칙·예측 선택지. 물성 수치 없음) */
import type { ExperimentCatalog, PredictionTarget, VariableOption } from "../types";
import type { ActionBlockDef, ItemDef, PosDef, QuantDef, Step } from "../../types";
import { initialSeparation1State, reduceSeparation1, type Separation1State } from "./reducer";

const eqIn = (s: Step, i: number): string | null => {
  const v = s.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};
const qIn = (s: Step, i: number): number => {
  const v = s.slots[i];
  return v && v.kind === "quant" ? v.value : 0;
};
const posIn = (s: Step, i: number): string | null => {
  const v = s.slots[i];
  return v && v.kind === "pos" ? v.id : null;
};

/** 한 시도에서 플라스크에 넣은 물질의 합 (없으면 null) */
const added = (trial: Step[], sub: string): number | null => {
  const adds = trial.filter((s) => s.action === "a1" && eqIn(s, 0) === "side_arm_flask" && eqIn(s, 1) === sub);
  return adds.length > 0 ? adds.reduce((a, s) => a + qIn(s, 2), 0) : null;
};

const mixtureVolume = (trial: Step[]): number | null => {
  const w = added(trial, "water");
  const e = added(trial, "ethanol");
  return w === null && e === null ? null : (w ?? 0) + (e ?? 0);
};

const mixtureRatio = (trial: Step[]): string | null => {
  const w = added(trial, "water");
  const e = added(trial, "ethanol");
  return w === null || e === null ? null : `물 ${w} : 에탄올 ${e}`;
};

const thermoPos = (trial: Step[]): string | null =>
  trial.filter((s) => s.action === "a4").map((s) => posIn(s, 0)).find((p) => p !== null) ?? null;

const heatingStrength = (trial: Step[]): string | null => (trial.some((s) => s.action === "a7") ? "서서히" : null);

const variableOptions: VariableOption[] = [
  { id: "ethanol_volume", label: "혼합물 속 에탄올의 양", roles: ["independent", "controlled"], extract: (t) => added(t, "ethanol") },
  { id: "mixture_ratio", label: "물과 에탄올의 혼합 비율", roles: ["independent", "controlled"], extract: mixtureRatio },
  { id: "heating_strength", label: "가열 세기(핫플레이트 세기)", roles: ["independent", "controlled"], extract: heatingStrength },
  { id: "mixture_volume", label: "혼합물 전체의 양", roles: ["controlled", "independent"], extract: mixtureVolume },
  { id: "water_volume", label: "혼합물 속 물의 양", roles: ["controlled", "independent"], extract: (t) => added(t, "water") },
  { id: "boiling_chips", label: "끓임쪽의 개수", roles: ["controlled"], extract: (t) => added(t, "boiling_chips") },
  { id: "thermometer_position", label: "온도계 끝의 위치", roles: ["controlled"], extract: thermoPos },
  { id: "vapour_temp", label: "가지 부분(빠져나가는 기체)의 온도", roles: ["dependent"] },
  { id: "plateau_length", label: "온도가 일정하게 유지되는 시간", roles: ["dependent"] },
  { id: "collected_volume", label: "시험관에 모인 액체의 양", roles: ["dependent"] },
  { id: "collected_smell", label: "시험관에 모인 액체의 냄새(종류)", roles: ["dependent"] },
  { id: "g_ethanol_10", label: "물 20 mL + 에탄올 10 mL", roles: ["group"] },
  { id: "g_ethanol_20", label: "물 20 mL + 에탄올 20 mL", roles: ["group"] },
  { id: "g_ethanol_30", label: "물 20 mL + 에탄올 30 mL", roles: ["group"] },
  { id: "m_distill", label: "가열해 끓어 나온 기체를 얼음물로 식혀 모으기(증류) + 일정 시간마다 온도 측정", roles: ["method"] },
  { id: "m_filter", label: "거름종이로 걸러 나누기", roles: ["method"] },
  { id: "m_layer", label: "가만히 두어 층을 나눈 뒤 위층만 따르기", roles: ["method"] },
];

const items: ItemDef[] = [
  { id: "water", label: "물", icon: "💧", kind: "liquid" },
  { id: "ethanol", label: "에탄올", icon: "🧴", kind: "liquid" },
  { id: "boiling_chips", label: "끓임쪽", icon: "🪨", kind: "solid" },
  { id: "side_arm_flask", label: "가지 달린 삼각플라스크", icon: "⚗️", kind: "container" },
  { id: "stopper_thermometer", label: "온도계 꽂은 마개", icon: "🔘", kind: "stopper" },
  { id: "thermometer", label: "온도계", icon: "🌡️", kind: "thermometer" },
  { id: "hot_plate", label: "핫플레이트", icon: "🔥", kind: "heater" },
  { id: "rubber_tube", label: "고무관", icon: "〰️", kind: "tube" },
  { id: "glass_tube", label: "유리관", icon: "📏", kind: "tube" },
  { id: "test_tube", label: "시험관", icon: "🧪", kind: "container" },
  { id: "ice_water_beaker", label: "얼음물 비커", icon: "🧊", kind: "cooler" },
  { id: "beaker", label: "비커", icon: "🫙", kind: "container" },
];

const quants: QuantDef[] = [
  { unit: "mL", label: "mL (밀리리터)" },
  { unit: "개", label: "개" },
  { unit: "s", label: "초" },
  { unit: "min", label: "분" },
  { unit: "°C", label: "℃ (도씨)" },
];

const positions: PosDef[] = [
  { id: "branch", label: "가지 갈라지는 부분" },
  { id: "in_solution", label: "용액 속" },
  { id: "flask_bottom", label: "플라스크 바닥" },
];

const actions: ActionBlockDef[] = [
  { id: "a1", text: "(  )에 (  )을(를) (  ) 넣는다", slots: [{ accepts: "equip" }, { accepts: "equip" }, { accepts: "quant", units: ["mL", "개"] }], guideline: ["2.2"] },
  { id: "a2", text: "(  )의 입구를 (  )(으)로 막는다", slots: [{ accepts: "equip" }, { accepts: "equip" }], guideline: ["2.2"] },
  { id: "a3", text: "(  )을(를) (  ) 위에 올린다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
  { id: "a4", text: "온도계 끝이 (  )에 오도록 높이를 조절한다", slots: [{ accepts: "pos" }], guideline: ["1.2"] },
  { id: "a5", text: "(  )에 (  )을(를) 연결한다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
  { id: "a6", text: "(  )을(를) (  ) 속에 넣는다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
  { id: "a7", text: "핫플레이트를 켜서 서서히 가열한다", slots: [], guideline: ["2.2"] },
  { id: "a8", text: "온도가 일정하게 유지될 때까지 (  )마다 온도를 측정한다", slots: [{ accepts: "quant", units: ["s", "min"] }], guideline: ["2.1"] },
  { id: "a9", text: "온도가 일정한 동안 얼음물 속 (  )에 어떤 변화가 생기는지 관찰한다", slots: [{ accepts: "equip" }] },
  { id: "a10", text: "온도가 다시 올라가기 시작하면 (  )을(를) 끄고 가열을 멈춘다", slots: [{ accepts: "equip" }], guideline: ["1.2"] },
  { id: "a11", text: "(  )에 들어 있는 액체를 확인한다", slots: [{ accepts: "equip" }] },
  { id: "a12", text: "시간에 따른 온도 변화를 그래프로 그려 온도가 일정한 구간을 찾는다", slots: [] },
];

const predictionTargets: PredictionTarget[] = [
  {
    id: "graph_shape",
    question: "물과 에탄올 혼합물을 서서히 가열할 때, 가지 부분 온도계의 눈금은 시간에 따라 어떻게 변할까요?",
    choices: [
      { id: "flat_near_ethanol", label: "에탄올의 끓는점 근처에서 한동안 거의 일정하다가 다시 올라간다" },
      { id: "steady_rise", label: "멈추지 않고 꾸준히 올라간다" },
      { id: "flat_at_100", label: "100 ℃가 될 때까지 오른 뒤 100 ℃에서만 일정하다" },
    ],
    sketch: { xMax: 900, yMin: 20, yMax: 120, points: 10 },
    hints: [
      "순수한 물을 끓일 때 끓는 동안 온도가 어떻게 되었는지 떠올려 보세요.",
      "물과 에탄올은 끓는점이 서로 달라요. 온도가 오르면서 어느 쪽의 끓는점에 먼저 도달할까요?",
      "한 물질이 기체가 되어 빠져나가는 동안 온도계가 어떻게 될지, 그 물질이 거의 다 빠져나간 뒤에는 어떻게 될지 차례로 생각해 보세요.",
    ],
  },

  {
    id: "first_collected",
    question: "얼음물 속 시험관에 먼저 모이는 액체는 무엇일까요?",
    choices: [
      { id: "ethanol", label: "주로 에탄올이 모인다" },
      { id: "water", label: "주로 물이 모인다" },
      { id: "both_equal", label: "물과 에탄올이 처음 섞인 비율 그대로 모인다" },
    ],
    hints: [
      "시험관에 모이는 액체는 플라스크에서 기체가 되어 빠져나온 물질이 다시 식은 거예요.",
      "가열하면 온도가 낮은 쪽에서부터 점점 올라가요. 더 낮은 온도에서 끓기 시작하는 물질은 어느 쪽일까요?",
      "물과 에탄올의 끓는점을 나란히 적어 보고, 온도가 오를 때 어느 끓는점을 먼저 지나게 되는지 비교해 보세요.",
    ],
  },
];

export const separation1Catalog: ExperimentCatalog<Separation1State> = {
  slug: "separation1",
  title: "끓는점 차를 이용한 혼합물 분리",
  standards: ["9과08-03"],
  goal: "끓는점이 다른 두 액체 혼합물을 가열하여 발생하는 기체를 냉각시키는 방법으로 각 물질을 분리할 수 있다.",
  scene: "separation1",
  items,
  quants,
  positions,
  actions,
  variableOptions,
  exampleSteps: [
    "가지 달린 삼각플라스크에 물을 20mL 넣는다",
    "가지 달린 삼각플라스크에 에탄올을 20mL 넣는다",
    "가지 달린 삼각플라스크에 끓임쪽을 3개 넣는다",
  ],
  predictionTargets,
  requiredSubjects: ["ethanol"],
  initialState: initialSeparation1State,
  reduce: reduceSeparation1,
  isTrialEnd: (s) => s.action === "a12",
};
