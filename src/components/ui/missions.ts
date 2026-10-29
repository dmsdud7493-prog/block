/** 첫 화면·과제 목록의 미션 카드 꾸밈 정보 */
/** 실험마다 궁금증을 여는 질문(화면 문구 — 정답이나 결과는 담지 않는다) */
export const MISSION: Record<string, { icon: string; hook: string; tone: string; chip: string }> = {
  density: { icon: "⚖️", hook: "크기가 다른 철조각, 밀도도 다를까?", tone: "border-sky", chip: "bg-sky" },
  melting: { icon: "🧊", hook: "녹는 동안 온도는 계속 올라갈까?", tone: "border-pink", chip: "bg-pink" },
  boiling: { icon: "🔥", hook: "물과 에탄올, 누가 먼저 끓을까?", tone: "border-sun", chip: "bg-sun" },
  solubility: { icon: "🧂", hook: "물 10 g에 얼마나 녹일 수 있을까?", tone: "border-mint", chip: "bg-mint" },
  separation1: { icon: "⚗️", hook: "섞인 두 액체를 다시 나눌 수 있을까?", tone: "border-[#4c97ff]", chip: "bg-[#4c97ff]" },
  separation2: { icon: "❄️", hook: "식히기만 했는데 결정이 생긴다고?", tone: "border-[#a78bfa]", chip: "bg-[#a78bfa]" },
};

export const MISSION_FALLBACK = { icon: "🔬", hook: "", tone: "border-line", chip: "bg-[#e2e8f0]" };
