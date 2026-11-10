/**
 * 탐구 보고서 — 교과서 탐구 활동지 모양(탐구 제목·목표·가설·준비물·과정(활동 1, 2…)·자료 해석(자료 1, 2…)·정리) (ADR-P20, 지침 6.1). AI·화면이 주는 도움은 섹션당 안내 질문 1·시작어 1뿐 — 문장을 완성하지 않는다(지침 5.4).
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
  /** 결과 표 — 실험 기록에서 옮겨 온 측정값·계산값(행: 회차·물질). 학생 화면과 교사 화면에서 표로 보여 준다 */
  resultsTable: z.object({
    columns: z.array(z.string().max(40)).max(12),
    rows: z.array(z.array(z.string().max(80)).max(12)).max(60),
  }).default({ columns: [], rows: [] }),
  /** 과정 — 활동별 제목과 순서(실험 기록에서 옮긴 초안, 학생이 고친다) */
  activities: z.array(z.object({ title: t(120), steps: t(3000) })).max(8).default([]),
  /** 자료 해석 — 자료 1, 2…: 활동별 결과 표·관찰·시간–온도 기록(실험 기록에서 늘 새로 만듦) + 학생이 쓴 "알 수 있는 점" */
  data: z.array(z.object({
    title: t(160),
    columns: z.array(z.string().max(40)).max(12).default([]),
    rows: z.array(z.array(z.string().max(80)).max(12)).max(60).default([]),
    observations: z.array(z.string().max(300)).max(10).default([]),
    series: z.array(z.object({ label: z.string().max(60), points: z.array(z.tuple([z.number(), z.number()])).max(80) })).max(6).default([]),
    note: t(800),
  })).max(8).default([]),
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

/** 보고서 칸 — 교과서 탐구 활동지 순서. id는 저장 형식·AI 도움 표시와 맞춘다(변인 칸은 ADR-P19로 뺐다) */
export const SECTIONS: SectionDef[] = [
  { id: "title", title: "탐구 제목", question: "무엇을 알아본 탐구인지 한 줄로 드러나나요?", starter: "~에 따른 ~의 변화", guideline: "6.1" },
  { id: "goal", title: "목표", question: "이 실험으로 무엇을 알고 싶었나요?", starter: "이 실험의 목표는", guideline: "6.1" },
  { id: "hypothesis", title: "가설", question: "실험 전에 예상한 것과 그 이유는 무엇이었나요?", starter: "~하면 ~할 것이다. 왜냐하면", guideline: "6.1" },
  { id: "materials", title: "준비물", question: "실험에 쓴 기구와 물질을 빠짐없이 적었나요?", starter: "", guideline: "6.1" },
  { id: "procedure", title: "과정", question: "다른 사람이 따라 할 수 있을 만큼 순서가 분명한가요?", starter: "", guideline: "6.2" },
  { id: "results", title: "자료 해석", question: "실험에서 얻은 자료를 번호를 붙여 정리했어요. 자료마다 알 수 있는 점을 써 봐요.", starter: "자료 1을 보면", guideline: "6.2" },
  { id: "interpretation", title: "정리", question: "탐구 결과를 해석하고, 알게 된 것을 정리해요.", starter: "", guideline: "6.3" },
  { id: "reflection", title: "성찰", question: "예상과 결과의 차이, 어려웠던 점, 더 알고 싶은 점, 생활 속 연결을 돌아봐요.", starter: "", guideline: "6.4" },
];

export const REFLECTION_QUESTIONS: { id: keyof ReportContent["reflection"]; label: string; starter: string }[] = [
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
    { id: "evidence", label: "그렇게 생각한 까닭(자료의 어떤 값을 보았는지)을 적었어요", ok: filled(c.interpretation.evidence, 5) },
    { id: "error", label: "값이 조금씩 달라진 까닭(오차)을 한 가지 이상 적었어요", ok: filled(c.interpretation.errorSources, 5) },
    { id: "improve", label: "다음에 더 잘하려면 어떻게 할지 적었어요", ok: filled(c.interpretation.improvements, 5) },
    { id: "reflection", label: `성찰 질문 ${REFLECTION_QUESTIONS.length}개에 모두 답했어요 (지금 ${reflections}개)`, ok: reflections >= REFLECTION_QUESTIONS.length },
  ];
}
