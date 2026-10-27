/**
 * 탐구 보고서 9항목 (plan §4.9, 지침 6.1). AI·화면이 주는 도움은 섹션당 안내 질문 1·시작어 1뿐 — 문장을 완성하지 않는다(지침 5.4).
 */
import { z } from "zod";

const t = (max: number) => z.string().max(max).default("");

export const reportContentSchema = z.object({
  title: t(100),
  goal: t(400),
  hypothesis: t(600),
  variables: z.object({ independent: t(200), dependent: t(200), controlled: t(300) }).default({ independent: "", dependent: "", controlled: "" }),
  materials: t(600),
  procedure: t(3000),
  results: t(2000),
  interpretation: z.object({
    trend: t(1000),
    hypothesisVerdict: z.enum(["", "supported", "rejected", "unclear"]).default(""),
    evidence: t(1000),
    errorSources: t(800),
    improvements: t(800),
  }).default({ trend: "", hypothesisVerdict: "", evidence: "", errorSources: "", improvements: "" }),
  reflection: z.object({ diff: t(800), hardest: t(800), curious: t(800), realLife: t(800) }).default({ diff: "", hardest: "", curious: "", realLife: "" }),
  drafts: z.array(z.string().max(30)).max(20).default([]),
});

export type ReportContent = z.infer<typeof reportContentSchema>;

export interface SectionDef {
  id: string;
  title: string;
  question: string;
  starter: string;
  guideline: string;
}

export const SECTIONS: SectionDef[] = [
  { id: "title", title: "1. 제목", question: "무엇을 알아본 탐구인지 한 줄로 드러나나요?", starter: "~에 따른 ~의 변화", guideline: "6.1" },
  { id: "goal", title: "2. 탐구 목표", question: "이 실험으로 무엇을 알고 싶었나요?", starter: "이 실험의 목표는", guideline: "6.1" },
  { id: "hypothesis", title: "3. 가설", question: "실험 전에 예상한 것과 그 이유는 무엇이었나요?", starter: "~하면 ~할 것이다. 왜냐하면", guideline: "6.1" },
  { id: "variables", title: "4. 변인", question: "무엇을 바꾸고, 무엇을 재고, 무엇을 같게 했나요?", starter: "조작 변인은", guideline: "6.1" },
  { id: "materials", title: "5. 준비물", question: "실험에 쓴 기구와 물질을 빠짐없이 적었나요?", starter: "", guideline: "6.1" },
  { id: "procedure", title: "6. 실험 과정", question: "다른 사람이 따라 할 수 있을 만큼 순서가 분명한가요?", starter: "", guideline: "6.2" },
  { id: "results", title: "7. 결과", question: "표와 그래프에서 무엇을 읽을 수 있나요?", starter: "표를 보면", guideline: "6.2" },
  { id: "interpretation", title: "8. 해석·결론", question: "가설은 지지되었나요? 근거가 되는 값은 어디에 있나요? 오차는 왜 생겼을까요?", starter: "가설은 (지지/기각)되었다. 근거는 표의", guideline: "6.3" },
  { id: "reflection", title: "9. 느낀 점·성찰", question: "예상과 결과의 차이, 어려웠던 점, 더 알고 싶은 점, 생활 속 연결을 돌아봐요.", starter: "", guideline: "6.4" },
];

export const REFLECTION_QUESTIONS: { id: keyof ReportContent["reflection"]; label: string; starter: string }[] = [
  { id: "diff", label: "예상과 결과는 어떻게 같거나 달랐나요? 그 이유는 무엇일까요?", starter: "나는 ~라고 예상했는데, 실제로는" },
  { id: "hardest", label: "실험하면서 가장 어려웠던 점과 그것을 어떻게 해결했나요?", starter: "가장 어려웠던 것은" },
  { id: "curious", label: "더 알아보고 싶은 점이나 바꿔서 해 보고 싶은 실험은 무엇인가요?", starter: "다음에는 ~을(를) 바꿔서" },
  { id: "realLife", label: "이번에 배운 물질의 특성을 생활 속 어디에서 볼 수 있나요?", starter: "생활 속에서" },
];

export const emptyReport = (): ReportContent => reportContentSchema.parse({});

const filled = (s: string, min: number) => s.trim().length >= min;

export interface SubmitCheck { id: string; label: string; ok: boolean }

/** 제출 조건 (지침 6.3·6.4) — 서버(app_submit_report)도 같은 기준으로 다시 검사한다 */
export function submitChecklist(c: ReportContent): SubmitCheck[] {
  const reflections = REFLECTION_QUESTIONS.filter((q) => filled(c.reflection[q.id], 10)).length;
  return [
    { id: "verdict", label: "결론에서 가설을 지지/기각/판단 보류 중 하나로 정했어요", ok: c.interpretation.hypothesisVerdict !== "" },
    { id: "evidence", label: "결론의 근거(표·그래프의 값)를 적었어요", ok: filled(c.interpretation.evidence, 5) },
    { id: "error", label: "오차가 생긴 까닭을 한 가지 이상 적었어요", ok: filled(c.interpretation.errorSources, 5) },
    { id: "improve", label: "다음에 고칠 점(개선안)을 적었어요", ok: filled(c.interpretation.improvements, 5) },
    { id: "reflection", label: `성찰 질문 4개 중 3개 이상 답했어요 (지금 ${reflections}개)`, ok: reflections >= 3 },
  ];
}
