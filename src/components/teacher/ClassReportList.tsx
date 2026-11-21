/** 반 보고서 목록 — 맨 위 요약(제출·채점 수), 학생마다 보고서와 공개된 채점 결과. 인쇄하면 학생마다 새 쪽 */
import Link from "next/link";
import { LEVEL_LABEL, RUBRIC, type RubricLevel } from "@/lib/report/rubric";
import type { ClassReportItem, ClassReports } from "@/lib/teacherTypes";
import ReportReadOnly from "./ReportReadOnly";

const STATE: Record<ClassReportItem["state"], string> = { graded: "🏁 채점 완료", returned: "↩️ 돌려줌(고치는 중)", waiting: "📮 채점 전" };
const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });

function Grade({ item }: { item: ClassReportItem }) {
  const rows = RUBRIC.filter((r) => item.rubric[r.id]);
  if (rows.length === 0 && !item.feedback.trim()) return null;
  return (
    <section aria-label={`${item.studentNo} 채점 결과`} className="rounded-lg border-2 border-ok bg-emerald-50 p-3 text-sm print:break-inside-avoid print:bg-white">
      <h3 className="font-bold">💬 선생님 채점</h3>
      <ul className="mt-1 space-y-0.5">{rows.map((r) => <li key={r.id}><strong>{r.title}</strong> — {LEVEL_LABEL[item.rubric[r.id] as RubricLevel]}</li>)}</ul>
      {item.feedback.trim() ? <p className="mt-1 whitespace-pre-wrap">{item.feedback}</p> : null}
    </section>
  );
}

function Report({ item, title, first }: { item: ClassReportItem; title: string; first: boolean }) {
  return (
    <article id={`report-${item.studentNo}`} aria-labelledby={`rt-${item.submissionId}`} className={`space-y-2 rounded-xl border border-line bg-panel p-3 print:rounded-none print:border-0 print:p-0 ${first ? "" : "print:break-before-page"}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`rt-${item.submissionId}`} className="text-lg font-bold">📝 {item.studentNo} · {title} 탐구 보고서</h2>
        <p className="text-sm text-muted">{when(item.submittedAt)} 제출{item.version > 1 ? ` · ${item.version}번째 제출` : ""}{item.late ? " · 마감 뒤" : ""} · {STATE[item.state]}</p>
      </header>
      <p className="print:hidden"><Link className="tap inline-flex items-center rounded-lg border-2 border-line bg-white px-3 text-sm font-bold" href={`/dashboard/submissions/${item.submissionId}`}>{item.state === "waiting" ? "✍️ 채점하러 가기" : "🔎 채점 화면 열기"}</Link></p>
      <ReportReadOnly content={item.content} aiAssisted={item.aiAssisted} />
      <Grade item={item} />
    </article>
  );
}

function Summary({ data }: { data: ClassReports }) {
  const n = (s: ClassReportItem["state"]) => data.items.filter((i) => i.state === s).length;
  return (
    <section aria-label="제출 현황" className="space-y-2 rounded-lg border border-line bg-panel p-3 text-sm print:hidden">
      <p className="font-semibold" role="status" aria-live="polite">제출 {data.items.length}명 · 채점 완료 {n("graded")}명 · 채점 전 {n("waiting")}명 · 고치는 중 {n("returned")}명</p>
      <ul className="flex flex-wrap gap-1.5">{data.items.map((i) => <li key={i.submissionId}><a className="tap inline-flex items-center rounded-full border border-line bg-white px-3 font-semibold" href={`#report-${i.studentNo}`}>{i.studentNo} {STATE[i.state].split(" ")[0]}</a></li>)}</ul>
      {data.notSubmitted.length ? <p className="text-muted">아직 내지 않은 학생: {data.notSubmitted.join(", ")}</p> : null}
      <p className="text-xs text-muted">인쇄 창에서 ‘대상’을 ‘PDF로 저장’으로 고르면 파일 하나로 보관할 수 있어요. 학생마다 새 쪽에서 시작해요.</p>
    </section>
  );
}

export default function ClassReportList({ data }: { data: ClassReports }) {
  const title = data.assignment?.title ?? "";
  if (data.items.length === 0) return <p className="text-sm text-muted">아직 이 실험 보고서를 낸 학생이 없어요.{data.notSubmitted.length ? ` (학생 ${data.notSubmitted.length}명)` : ""}</p>;
  return (
    <div className="space-y-4">
      <Summary data={data} />
      {data.items.map((item, i) => <Report key={item.submissionId} item={item} title={title} first={i === 0} />)}
    </div>
  );
}
