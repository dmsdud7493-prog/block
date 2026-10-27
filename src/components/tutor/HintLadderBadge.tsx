/** 힌트 사다리 표시 (지침 4.1) — 지금 어느 정도의 도움을 받았는지 학생이 볼 수 있게 */
const STEPS = ["점검 질문", "개념", "예시", "다음 단계"];

export default function HintLadderBadge({ level }: { level: number }) {
  if (level < 0) return null;
  return (
    <ol className="flex gap-1 text-[11px]" aria-label={`힌트 단계 ${level + 1}/4: ${STEPS[level]}`}>
      {STEPS.map((t, i) => <li key={t} className={`rounded px-1 ${i === level ? "bg-amber-200 font-bold text-amber-900" : "bg-slate-100 text-muted"}`}>{t}</li>)}
    </ol>
  );
}
