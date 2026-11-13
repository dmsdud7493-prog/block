/** 용해도 측정 — 카탈로그 (클라이언트 허용: 블록·용품 종류·규칙·예측 선택지. 용해도 수치 없음) */
import type { ExperimentCatalog, VariableOption } from "../types";
import type { Step } from "../../types";
import { reduceSolubility, initialSolubilityState, type SolubilityState } from "./reducer";
import { BATHS, ROOM_T } from "./model";

const eqIn = (s: Step, i: number): string | null => {
  const v = s.slots[i];
  return v && v.kind === "equip" ? v.id : null;
};
const qIn = (s: Step, i: number): number | null => {
  const v = s.slots[i];
  return v && v.kind === "quant" ? v.value : null;
};

/** 한 시도에서 녹인 용질 (뜨기·넣기·반복·기록 블록의 첫 칸) */
const soluteOf = (trial: Step[]): string | null =>
  trial.filter((s) => ["a3", "a4", "a5", "a6"].includes(s.action)).map((s) => eqIn(s, 0)).find((x) => x !== null) ?? null;

/** 한 시도에서 시험관에 넣은 물의 양 (g과 mL는 물이므로 같은 수로 본다) */
const waterOf = (trial: Step[]): number | null => {
  const first = trial.find((s) => s.action === "a1");
  return first ? qIn(first, 2) : null;
};

/** 한 시도의 온도: 마지막으로 담근 비커의 온도, 비커 없이 기록만 했으면 실온 */
const tempOf = (trial: Step[]): number | null => {
  const baths = trial.filter((s) => s.action === "a7").map((s) => eqIn(s, 1)).filter((b): b is string => b !== null && b in BATHS);
  const last = baths[baths.length - 1];
  if (last) return BATHS[last];
  return trial.some((s) => s.action === "a6") ? ROOM_T : null;
};

const variableOptions: VariableOption[] = [
  { id: "solute_type", label: "용질의 종류", roles: ["independent", "controlled"], extract: soluteOf },
  { id: "temperature", label: "물의 온도", roles: ["independent", "controlled"], extract: tempOf },
  { id: "water_amount", label: "물의 양", roles: ["controlled", "independent"], extract: waterOf },
  { id: "tube", label: "시험관의 종류·크기", roles: ["controlled"], extract: () => "test_tube" },
  { id: "dissolved_amount", label: "녹은 용질의 양", roles: ["dependent"] },
  { id: "solubility", label: "물 100 g에 녹는 양(용해도)", roles: ["dependent"] },
  { id: "undissolved", label: "녹지 않고 남은 양(결정)", roles: ["dependent"] },
  { id: "g_kno3", label: "질산 칼륨", roles: ["group"] },
  { id: "g_cuso4", label: "황산 구리(II)", roles: ["group"] },
  { id: "g_hot", label: "뜨거운 물(약 60 °C)", roles: ["group"] },
  { id: "g_ice", label: "얼음물(약 0 °C)", roles: ["group"] },
  { id: "m_saturate", label: "조금씩 넣고 흔들어 더 녹지 않을 때까지의 총량 재기", roles: ["method"] },
  { id: "m_bath", label: "시험관을 온도가 다른 물이 담긴 비커에 넣고 관찰하기", roles: ["method"] },
  { id: "m_dump_all", label: "용질을 한꺼번에 많이 넣고 물의 부피 변화 재기", roles: ["method"] },
];

export const solubilityCatalog: ExperimentCatalog<SolubilityState> = {
  slug: "solubility",
  title: "용해도 측정",
  standards: ["9과08-02"],
  goal: "일정한 양의 용매에 녹는 용질의 양이 물질의 종류와 온도에 따라 다름을 설명할 수 있다.",
  scene: "solubility",
  items: [
    { id: "water", label: "물", icon: "💧", kind: "solvent" },
    { id: "kno3", label: "질산 칼륨", icon: "🧂", kind: "solute" },
    { id: "cuso4", label: "황산 구리(II)", icon: "🔷", kind: "solute" },
    { id: "tube_a", label: "시험관 A", icon: "🧪", kind: "container" },
    { id: "tube_b", label: "시험관 B", icon: "🧪", kind: "container" },
    { id: "tube_c", label: "시험관 C", icon: "🧪", kind: "container" },
    { id: "scale", label: "전자저울", icon: "⚖️", kind: "scale" },
    { id: "weighing_paper", label: "시약포지", icon: "📄", kind: "paper" },
    { id: "spatula", label: "약숟가락", icon: "🥄", kind: "tool" },
    { id: "hot_water", label: "뜨거운 물", icon: "♨️", kind: "bath" },
    { id: "ice_water", label: "얼음물", icon: "🧊", kind: "bath" },
    { id: "thermometer", label: "온도계", icon: "🌡️", kind: "tool" },
  ],

  quants: [
    { unit: "g", label: "g (그램)" },
    { unit: "mL", label: "mL (밀리리터)" },
    { unit: "°C", label: "°C (도)" },
    { unit: "s", label: "초" },
  ],
  positions: [],

  actions: [
    { id: "a1", text: "(  )에 실온의 (  )을(를) (  ) 넣는다", slots: [{ accepts: "equip" }, { accepts: "equip" }, { accepts: "quant", units: ["g", "mL"] }] },
    { id: "a2", text: "(  ) 위에 (  )을(를) 올리고 영점 조정을 한다", slots: [{ accepts: "equip" }, { accepts: "equip" }], guideline: ["2.2"] },
    { id: "a3", text: "(  )을(를) (  )만큼 (  )(으)로 떠서 시약포지에 올린다", slots: [{ accepts: "equip" }, { accepts: "quant", units: ["g"] }, { accepts: "equip" }] },
    { id: "a4", text: "시약포지의 (  )을(를) (  )에 넣고 잘 흔들어 녹인다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
    { id: "a5", text: "(  )이(가) 더 이상 녹지 않고 바닥에 가라앉을 때까지 (  )씩 넣고 흔든다", slots: [{ accepts: "equip" }, { accepts: "quant", units: ["g"] }] },
    { id: "a6", text: "넣은 (  )의 총량을 기록한다", slots: [{ accepts: "equip" }] },
    { id: "a7", text: "(  )을(를) (  )이(가) 담긴 비커에 넣고 변화를 관찰한다", slots: [{ accepts: "equip" }, { accepts: "equip" }] },
    { id: "a8", text: "(  )의 변화를 관찰한다", slots: [{ accepts: "equip" }] },
  ],

  variableOptions,
  exampleSteps: [
    "시험관 A에 실온의 물을 10g 넣는다",
    "전자저울 위에 시약포지를 올리고 영점 조정을 한다",
    "질산 칼륨을 1g만큼 약숟가락으로 떠서 시약포지에 올린다",
  ],

  predictionTargets: [
    {
      id: "more_at_room",
      subjects: ["kno3", "cuso4"],
      question: "실온(20 °C)의 물 10 g에 질산 칼륨과 황산 구리(II) 중 어느 쪽이 더 많이 녹을까요?",
      choices: [
        { id: "kno3", label: "질산 칼륨이 더 많이 녹는다" },
        { id: "cuso4", label: "황산 구리(II)가 더 많이 녹는다" },
        { id: "same", label: "두 물질이 똑같이 녹는다" },
      ],
      hints: [
        "설탕과 소금을 같은 양의 물에 녹여 본 적이 있나요? 녹는 양이 같았을까요?",
        "물의 양과 온도를 똑같이 맞추면, 남는 차이는 무엇일까요?",
        "녹는 양이 물질마다 정해져 있다면, 그 값은 물질을 구별하는 '특성'이 될 수 있을까요?",
      ],
    },

    {
      id: "kno3_temp",
      question: "질산 칼륨을 얼음물(약 0 °C), 실온(20 °C), 뜨거운 물(약 60 °C) 속 시험관의 물 10 g에 각각 더 녹지 않을 때까지 녹이면, 녹는 양은 어떻게 다를까요?",
      subjects: ["kno3", "ice_water", "hot_water"],
      choices: [
        { id: "hot_most", label: "뜨거운 물에서 가장 많이, 얼음물에서 가장 적게 녹는다" },
        { id: "ice_most", label: "얼음물에서 가장 많이, 뜨거운 물에서 가장 적게 녹는다" },
        { id: "same", label: "온도와 상관없이 녹는 양이 같다" },
      ],
      hints: [
        "따뜻한 코코아와 차가운 우유 중 어디에 가루가 더 잘 녹았나요?",
        "온도가 바뀌어도 같은 물 10 g이 녹일 수 있는 양은 그대로일까요?",
        "미션 ①에서 구한 실온의 값을 기준으로, 더 차갑거나 더 뜨거우면 어느 쪽으로 바뀔지 생각해 봐요.",
      ],
    },
  ],

  /**
   * 미션 ①② 실온에서 두 물질 비교(종류), 미션 ③ 온도에 따라 녹는 양이 크게 바뀌는 질산 칼륨으로 온도 비교.
   * "kno3@60"은 60 °C(뜨거운 물 비커에 담근 시험관)에서 맞힌 '물 100 g에 녹는 양' 계산값 (사용자 요청 2026-11-13)
   */
  missions: [
    {
      id: "kno3", icon: "🧂", title: "질산 칼륨은 실온의 물 10 g에 얼마나 녹을까? 녹인 양으로 물 100 g에 녹는 양을 구해 봐",
      cheer: "🎉 미션 ① 성공! 질산 칼륨이 녹는 양을 구했네. 다른 물질도 똑같이 녹을까? 이제 미션 ② 황산 구리(II) 차례야 💪",
      done: { solved: ["kno3@20"] },
    },
    {
      id: "cuso4", icon: "💎", title: "황산 구리(II)도 같은 방법으로! 두 물질이 녹는 양을 비교해 봐",
      cheer: "🎉 미션 ② 성공! 두 물질이 녹는 양은 같았어? 이번엔 온도를 바꿔 볼 차례야. 미션 ③으로 가 보자 🌡️",
      done: { solved: ["cuso4@20"] },
    },
    {
      id: "kno3_temp", icon: "🌡️", title: "질산 칼륨을 얼음물·실온·뜨거운 물에서! 온도에 따라 녹는 양을 비교해 봐",
      cheer: "🏆 미션 ③ 성공! 온도가 바뀌니 녹는 양도 달라졌어? 세 온도의 값을 보고서에서 비교해 보자 ✨",
      done: { solved: ["kno3@0", "kno3@20", "kno3@60"] },
      report: "온도에 따른 질산 칼륨의 용해도 비교하기",
    },
  ],
  requiredSubjects: ["kno3", "cuso4"],
  initialState: initialSolubilityState,
  reduce: reduceSolubility,
  /**
   * 시도 경계: a6(총량 기록 — 실험1의 한 물질 측정 끝) 또는 a7(비커에 넣고 관찰 — 실험2의 한 온도 조건 끝).
   * 프로토타입 collectResults가 record와 bath를 결과 행으로 삼는 것과 맞춘다. a8(단순 관찰)은 상태만 보므로 경계가 아니다.
   * 이렇게 나누면 실험2에서 '물의 온도'가 시도마다 달라져(60 → 0 °C) 조작 변인 검사가 자연스럽게 된다.
   */
  isTrialEnd: (s) => s.action === "a6" || s.action === "a7",
};
