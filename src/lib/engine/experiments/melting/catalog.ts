/** 녹는점 측정 — 카탈로그 (클라이언트 허용: 블록·용품 종류·규칙·예측 선택지. 물성 수치 없음) */
import type { ExperimentCatalog, PredictionTarget, VariableOption } from "../types";
import type { Step } from "../../types";
import { reduceMelting, initialMeltingState, type MeltingState } from "./reducer";
import { eq, quant, toSec } from "./model";

const intoTube = (s: Step): boolean => s.action === "a1" && eq(s, 0) === "test_tube";
const intoBeaker = (s: Step): boolean => s.action === "a1" && eq(s, 0) === "beaker";

/** 한 시도에서 시험관에 넣은 물질 */
const substanceOf = (trial: Step[]): string | null =>
  trial.filter(intoTube).map((s) => eq(s, 1)).find((x) => x !== null) ?? null;

const sumAmount = (steps: Step[]): number | null => {
  const amounts = steps.map((s) => quant(s, 2)?.value ?? null).filter((v): v is number => v !== null);
  return amounts.length > 0 ? Math.round(amounts.reduce((a, b) => a + b, 0) * 10) / 10 : null;
};

const sampleMass = (trial: Step[]): number | null => sumAmount(trial.filter(intoTube));
const waterVolume = (trial: Step[]): number | null => sumAmount(trial.filter(intoBeaker));

const heatingMethod = (trial: Step[]): string | null => {
  const onHot = trial.find((s) => s.action === "a2" && eq(s, 1) === "hot_plate");
  if (!onHot) return null;
  return eq(onHot, 0) === "beaker" ? "water_bath" : "direct";
};

const interval = (trial: Step[]): number | null => {
  const m = trial.find((s) => s.action === "a7");
  return m ? toSec(m, 1) : null;
};

const variableOptions: VariableOption[] = [
  { id: "substance", label: "물질의 종류(로르산·팔미트산)", roles: ["independent", "controlled"], extract: substanceOf },
  { id: "sample_mass", label: "시료의 질량", roles: ["independent", "controlled"], extract: sampleMass },
  { id: "water_volume", label: "비커 속 물의 양", roles: ["controlled"], extract: waterVolume },
  { id: "heating_method", label: "가열 방법(물중탕)", roles: ["controlled"], extract: heatingMethod },
  { id: "interval", label: "온도 측정 간격", roles: ["controlled"], extract: interval },
  { id: "melting_point", label: "녹는점(온도가 일정한 구간의 온도)", roles: ["dependent"] },
  { id: "temperature", label: "시간에 따른 시료의 온도", roles: ["dependent"] },
  { id: "melt_time", label: "다 녹는 데 걸린 시간", roles: ["dependent"] },
  { id: "g_lauric", label: "로르산", roles: ["group"] },
  { id: "g_palmitic", label: "팔미트산", roles: ["group"] },
  { id: "g_mass_3", label: "로르산 3 g", roles: ["group"] },
  { id: "g_mass_6", label: "로르산 6 g", roles: ["group"] },
  { id: "m_bath_graph", label: "물중탕으로 가열하며 일정 시간마다 온도를 재고, 시간–온도 그래프의 평평한 구간 읽기", roles: ["method"] },
  { id: "m_direct_once", label: "시험관을 핫플레이트에 바로 올려 녹기 시작할 때 온도를 한 번만 읽기", roles: ["method"] },
  { id: "m_water_temp", label: "비커 속 물의 온도를 재기", roles: ["method"] },
];

const ACTIONS: ExperimentCatalog<MeltingState>["actions"] = [
  { id: "a1", text: "(  )에 (  )을(를) (  ) 넣는다", slots: [{ accepts: "equip" }, { accepts: "equip" }, { accepts: "quant" }], guideline: ["2.2"] },
  { id: "a2", text: "(  )을(를) (  ) 위에 올린다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
  { id: "a3", text: "(  )을(를) 비커 속 물에 충분히 잠기도록 스탠드에 고정한다", slots: [{ accepts: "equip" }] },
  { id: "a4", text: "(  )을(를) (  ) 속에 꽂는다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
  { id: "a5", text: "온도계 끝이 (  )의 한가운데에 오도록 높이를 맞춘다", slots: [{ accepts: "equip" }] },
  { id: "a6", text: "핫플레이트를 켜서 물을 서서히 가열한다", slots: [] },
  { id: "a7", text: "(  )이(가) 다 녹을 때까지 (  )마다 온도를 측정한다", slots: [{ accepts: "equip" }, { accepts: "quant", units: ["s", "min"] }] },
  { id: "a8", text: "완전히 투명한 액체가 된 뒤 (  ) 동안 온도를 더 측정한다", slots: [{ accepts: "quant", units: ["s", "min"] }] },
  { id: "a9", text: "시간에 따른 온도 변화를 그래프로 그려 (  )의 녹는점을 찾는다", slots: [{ accepts: "equip" }], guideline: ["5.4"] },
];

const PREDICTIONS: PredictionTarget[] = [
  {
    id: "graph_shape",
    question: "고체 로르산이 녹는 동안 온도는 시간에 따라 어떻게 변할까요?",
    choices: [
      { id: "rise", label: "계속 일정하게 올라간다" },
      { id: "flat_then_rise", label: "한동안 변하지 않다가 다 녹은 뒤 다시 올라간다" },
      { id: "drop", label: "녹는 동안 온도가 내려간다" },
    ],
    sketch: { xMax: 600, yMin: 20, yMax: 100, points: 9 },
    hints: [
      "얼음이 든 물을 데울 때, 얼음이 다 녹기 전까지 물의 온도는 어땠는지 떠올려 보세요.",
      "핫플레이트가 계속 주는 열은 녹는 동안 어디에 쓰일까요? 온도를 올리는 데일까요, 다른 일일까요?",
      "고체와 액체가 함께 있는 동안과 모두 액체가 된 뒤를 나누어 각각 온도가 어떨지 생각해 보세요.",
    ],
  },
  {
    id: "mass_same_mp",
    question: "로르산 3 g과 6 g의 녹는점은 어떨까요?",
    choices: [
      { id: "same", label: "두 경우의 녹는점은 같다" },
      { id: "more_higher", label: "6 g의 녹는점이 더 높다" },
      { id: "less_higher", label: "3 g의 녹는점이 더 높다" },
    ],
    hints: [
      "양이 많으면 '녹는 데 걸리는 시간'과 '녹는 온도' 중 무엇이 달라질지 나누어 생각해 보세요.",
      "얼음 한 조각과 얼음 한 봉지는 몇 ℃에서 녹기 시작하나요?",
      "물질의 양과 상관없이 그 물질만의 값으로 정해지는 성질을 '물질의 특성'이라고 해요. 녹는점은 어느 쪽일까요?",
    ],
  },
];

export const meltingCatalog: ExperimentCatalog<MeltingState> = {
  slug: "melting",
  title: "녹는점 측정",
  standards: ["9과08-01"],
  goal: "고체 물질을 가열할 때의 온도 변화를 관찰하고, 물질의 종류에 따라 녹는점이 다름을 설명할 수 있다.",
  scene: "melting",
  items: [
    { id: "lauric_acid", label: "로르산", icon: "🧈", kind: "solid" },
    { id: "palmitic_acid", label: "팔미트산", icon: "🕯️", kind: "solid" },
    { id: "water", label: "물", icon: "💧", kind: "liquid" },
    { id: "test_tube", label: "시험관", icon: "🧪", kind: "container" },
    { id: "beaker", label: "비커", icon: "🫙", kind: "container" },
    { id: "hot_plate", label: "핫플레이트", icon: "🔥", kind: "heater" },
    { id: "stand", label: "스탠드", icon: "🏗️", kind: "tool" },
    { id: "thermometer", label: "온도계", icon: "🌡️", kind: "thermometer" },
  ],
  quants: [
    { unit: "g", label: "g (그램)" },
    { unit: "mL", label: "mL (밀리리터)" },
    { unit: "s", label: "초" },
    { unit: "min", label: "분" },
    { unit: "°C", label: "℃ (도씨)" },
  ],
  positions: [],
  actions: ACTIONS,
  variableOptions,
  exampleSteps: [
    "시험관에 로르산을 5g 넣는다",
    "비커에 물을 125mL 넣는다",
    "비커를 핫플레이트 위에 올린다",
  ],
  predictionTargets: PREDICTIONS,
  requiredSubjects: ["lauric_acid", "palmitic_acid"],
  initialState: initialMeltingState,
  reduce: reduceMelting,
  isTrialEnd: (s) => s.action === "a9",
};
