/**
 * 용해도 차를 이용한 혼합물 분리(재결정) — 카탈로그 (클라이언트 허용: 블록·용품·규칙·예측 선택지. 물성 수치 없음).
 * 시도 경계: '거름종이 위의 물질과 걸러진 용액을 확인한다'(a8). 선택 블록 a9(말린 결정 질량)가 a8 뒤에 오면
 * 엔진의 시도 번호는 이미 넘어가 있지만, 리듀서가 resultTrial로 같은 시도의 측정값 키를 붙인다.
 */
import { SOLUBILITY_REFERENCE } from "./table";
import type { ExperimentCatalog, VariableOption } from "../types";
import type { Step } from "../../types";
import { reduceSeparation2, initialSeparation2State, type Separation2State } from "./reducer";

const eqIn = (s: Step, i: number): string | null => {
  const v = s.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};

const qIn = (s: Step, i: number): number => {
  const v = s.slots[i];
  return v && v.kind === "quant" ? v.value : 0;
};

/** 한 시도에서 비커에 넣은 물질의 총량 (넣지 않았으면 null) */
const addedIn = (trial: Step[], sub: string): number | null => {
  const adds = trial.filter((s) => s.action === "a1" && eqIn(s, 0) === "beaker" && eqIn(s, 1) === sub);
  return adds.length === 0 ? null : Math.round(adds.reduce((a, s) => a + qIn(s, 2), 0) * 10) / 10;
};

/** 식히는 조건 — 식히기 블록(a3)에 넣은 냉각제 (식히기 블록이 없으면 null) */
const coolingOf = (trial: Step[]): string | null =>
  trial.filter((s) => s.action === "a3").map((s) => eqIn(s, 1)).find((x) => x !== null) ?? null;

const variableOptions: VariableOption[] = [
  { id: "cool_temp", label: "식히는 온도(얼음물로 식히기)", roles: ["independent", "controlled"], extract: coolingOf },
  { id: "cuso4_amount", label: "넣은 황산 구리(II)의 양", roles: ["independent", "controlled"], extract: (t) => addedIn(t, "cuso4") },
  { id: "boric_amount", label: "넣은 붕산의 양", roles: ["controlled", "independent"], extract: (t) => addedIn(t, "boric_acid") },
  { id: "hot_water_amount", label: "뜨거운 물의 양", roles: ["controlled"], extract: (t) => addedIn(t, "hot_water") },
  { id: "crystal_mass", label: "거름종이 위에 남은 결정(말린 결정)의 질량", roles: ["dependent"] },
  { id: "crystal_kind", label: "거름종이 위에 남은 물질의 종류(색)", roles: ["dependent"] },
  { id: "filtrate_color", label: "걸러진 용액의 색", roles: ["dependent"] },

  { id: "g_cuso4_small", label: "황산 구리(II)를 조금(1 g) 넣은 혼합물", roles: ["group"] },
  { id: "g_cuso4_large", label: "황산 구리(II)를 많이(30 g) 넣은 혼합물", roles: ["group"] },
  { id: "g_cooled", label: "얼음물로 식힌 용액", roles: ["group"] },
  { id: "g_not_cooled", label: "식히지 않은 용액", roles: ["group"] },
  { id: "m_recrystallize", label: "뜨거운 물에 모두 녹인 뒤 식혀서 생긴 결정을 거르기", roles: ["method"] },
  { id: "m_filter_hot", label: "녹인 뒤 식히지 않고 바로 거르기", roles: ["method"] },
  { id: "m_evaporate", label: "물을 모두 증발시켜 남은 가루를 모으기", roles: ["method"] },
];

export const separation2Catalog: ExperimentCatalog<Separation2State> = {
  slug: "separation2",
  title: "용해도 차를 이용한 혼합물 분리",
  standards: ["9과08-03"],
  goal: "온도에 따른 용해도 변화가 큰 물질과 작은 물질이 섞여 있을 때, 냉각하는 방법으로 원하는 물질을 분리할 수 있다.",
  scene: "separation2",
  items: [
    { id: "boric_acid", label: "붕산", icon: "⚪", kind: "solute" },
    { id: "cuso4", label: "황산 구리(II)", icon: "🔷", kind: "solute" },
    { id: "hot_water", label: "뜨거운 물", icon: "♨️", kind: "water" },
    { id: "ice_water", label: "얼음물", icon: "🧊", kind: "water" },
    { id: "beaker", label: "비커", icon: "🫙", kind: "container" },
    { id: "large_beaker", label: "큰 비커", icon: "🪣", kind: "container" },
    { id: "glass_rod", label: "유리 막대", icon: "🥢", kind: "tool" },
    { id: "thermometer", label: "온도계", icon: "🌡️", kind: "thermometer" },
    { id: "stand", label: "스탠드", icon: "🗜️", kind: "tool" },
    { id: "funnel", label: "깔때기", icon: "🔻", kind: "tool" },
    { id: "filter_paper", label: "거름종이", icon: "📄", kind: "tool" },
    { id: "scale", label: "전자저울", icon: "⚖️", kind: "scale" },
  ],
  quants: [
    { unit: "g", label: "g (그램)" },
    { unit: "mL", label: "mL (밀리리터)" },
    { unit: "°C", label: "°C (도)" },
    { unit: "min", label: "분" },
  ],
  positions: [],

  actions: [
    { id: "a1", text: "(  )에 (  )을(를) (  ) 넣는다", slots: [{ accepts: "equip" }, { accepts: "equip" }, { accepts: "quant", units: ["g", "mL"] }], guideline: ["2.2"] },
    { id: "a2", text: "(  )(으)로 저어 모두 녹인다", slots: [{ accepts: "equip" }] },
    { id: "a3", text: "(  )을(를) (  )이(가) 담긴 (  )에 넣어 식힌다", slots: [{ accepts: "equip" }, { accepts: "equip" }, { accepts: "equip" }], guideline: ["1.2"] },
    { id: "a4", text: "(  )(으)로 용액의 온도를 측정한다", slots: [{ accepts: "equip" }] },
    { id: "a5", text: "용액 속에 생긴 결정을 관찰한다", slots: [] },
    { id: "a6", text: "(  )에 (  )을(를) 설치하고 (  )을(를) 깐다", slots: [{ accepts: "equip" }, { accepts: "equip" }, { accepts: "equip" }] },
    { id: "a7", text: "(  )의 내용물을 (  )을(를) 따라 깔때기에 천천히 붓는다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
    { id: "a8", text: "거름종이 위의 물질과 걸러진 용액을 확인한다", slots: [] },
    { id: "a9", text: "(  ) 위의 결정을 말린 뒤 (  )(으)로 질량을 측정한다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
  ],

  variableOptions,
  exampleSteps: [
    "비커에 뜨거운 물을 100g 넣는다",
    "비커에 붕산을 10g 넣는다",
    "비커에 황산 구리(II)를 1g 넣는다",
  ],

  predictionTargets: [
    {
      id: "cool_result",
      question: "붕산 10 g과 황산 구리(II) 1 g을 녹인 뜨거운 용액을 얼음물로 식히면 어떻게 될까요?",
      choices: [
        { id: "white_crystals", label: "흰색 결정이 생긴다" },
        { id: "blue_crystals", label: "파란색 결정이 생긴다" },
        { id: "nothing", label: "아무것도 생기지 않는다" },
      ],
      hints: [
        "고체가 물에 녹을 수 있는 양은 온도에 따라 어떻게 달라질까요?",
        "식혔을 때 녹을 수 있는 양보다 녹아 있는 양이 더 많으면 어떤 일이 생길까요?",
        "용해도 표에서 두 물질의 낮은 온도 값과 실제로 넣은 양을 하나씩 비교해 보세요.",
      ],
    },

    {
      id: "filter_split",
      question: "식힌 비커의 내용물을 거르면 거름종이 위와 걸러진 용액에는 각각 무엇이 있을까요?",
      choices: [
        { id: "boric_paper_cuso4_filtrate", label: "거름종이 위: 붕산 / 걸러진 용액: 황산 구리(II)가 녹아 있음" },
        { id: "cuso4_paper_boric_filtrate", label: "거름종이 위: 황산 구리(II) / 걸러진 용액: 붕산이 녹아 있음" },
        { id: "both_paper", label: "두 물질이 모두 거름종이 위에 남는다" },
      ],
      hints: [
        "거름종이는 어떤 것을 통과시키고 어떤 것을 걸러 낼까요?",
        "물에 녹아 있는 물질과 고체로 나온 물질 중 거름종이를 통과하는 것은 무엇일까요?",
        "앞에서 예상한 '식혔을 때 생기는 결정'이 어느 물질인지 떠올려 보고, 나머지 물질은 어디에 있을지 생각해 보세요.",
      ],
    },
  ],

  reference: [SOLUBILITY_REFERENCE],
  requiredSubjects: ["boric_acid"],
  initialState: initialSeparation2State,
  reduce: reduceSeparation2,
  isTrialEnd: (s) => s.action === "a8",
};
