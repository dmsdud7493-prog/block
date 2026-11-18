/**
 * 실험별 과학자 짝꿍 — 미션 카드의 얼굴 캐릭터와 실험 목록의 배지 (2026-11-18 사용자 요청).
 * 얼굴은 사진이 아니라 단순한 그림 캐릭터다. 한 줄 이야기는 학생이 실험과 연결할 수 있는 사실만 적는다.
 */
export interface Scientist {
  name: string;
  /** 배지 아래 작은 글씨(한 줄) */
  story: string;
  /** 얼굴 꾸미기 — ScientistFace가 그린다 */
  look: "archimedes" | "gaylussac" | "black" | "celsius" | "jabir" | "curie";
  /** 비커 속 액체 색 */
  liquid: string;
}

export const SCIENTISTS: Record<string, Scientist> = {
  density: { name: "아르키메데스", look: "archimedes", liquid: "#38bdf8", story: "물에 넣어 늘어난 부피로 왕관이 진짜 금인지 알아냈다고 전해져요. 유레카!" },
  solubility: { name: "게이뤼삭", look: "gaylussac", liquid: "#34d399", story: "온도에 따라 녹는 양이 어떻게 바뀌는지 처음으로 그래프(용해도 곡선)로 그렸어요." },
  melting: { name: "조지프 블랙", look: "black", liquid: "#f472b6", story: "얼음이 녹는 동안 열을 받아도 온도가 오르지 않는다는 걸 밝혔어요." },
  boiling: { name: "셀시우스", look: "celsius", liquid: "#fbbf24", story: "물이 얼고 끓는 온도로 우리가 쓰는 온도 눈금(°C)을 만들었어요." },
  separation1: { name: "자비르", look: "jabir", liquid: "#2dd4bf", story: "8세기 연금술사 자비르 이븐 하이얀. 증류 장치를 다듬고 실험을 강조해 '화학의 아버지'로 불려요." },
  separation2: { name: "마리 퀴리", look: "curie", liquid: "#a78bfa", story: "녹이고 식혀 결정을 거르는 일을 수천 번 되풀이해 라듐을 찾아냈어요." },
};

export const scientistOf = (slug: string): Scientist | null => SCIENTISTS[slug] ?? null;
