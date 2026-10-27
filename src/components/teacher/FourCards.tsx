/**
 * T-03 4카드 (D11, 지침 1.4 교사 뷰): 막힌 학생 / 미제출·지각 / 플래그된 AI 대화 / 공통 오답 상위 3.
 * 카드마다 "다음 행동"을 한 줄로 준다. 학생 화면에는 이런 집계(반 평균·순위)를 절대 보여 주지 않는다.
 */
import Link from "next/link";
import type { ClassBoard } from "@/lib/teacherTypes";
import type { CommonError, FlagCard, StuckCard, SubmissionCard } from "@/lib/events/cards";

const sessionHref = (id: string) => `/dashboard/sessions/${id}`;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

function Card({ id, icon, title, count, tone, next, children }: { id: string; icon: string; title: string; count: number; tone: string; next: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={`rounded-lg border-2 bg-panel p-3 ${count > 0 ? tone : "border-line"}`}>
      <h3 id={id} className="flex items-center justify-between font-bold"><span>{icon} {title}</span><span className="text-2xl tabular-nums">{count}</span></h3>
      <div className="mt-2 text-sm">{children}</div>
      <p className="mt-2 border-t border-line pt-2 text-xs text-muted"><strong>다음 행동</strong> · {next}</p>
    </section>
  );
}

function StuckList({ card }: { card: StuckCard }) {
  if (card.students.length === 0) return <p className="text-muted">지금 막힌 학생이 없어요.</p>;
  return <ul className="space-y-1">{card.students.slice(0, 6).map((s) => <li key={s.sessionId}><Link className="font-semibold underline" href={sessionHref(s.sessionId)}>{s.studentNo}</Link> — {s.reasons.join(", ")}</li>)}</ul>;
}

function SubmissionList({ card, subOf }: { card: SubmissionCard; subOf: Record<string, string> }) {
  const grade = card.toGrade.slice(0, 6).map((g) => <li key={g.sessionId}><Link className="font-semibold underline" href={`/dashboard/submissions/${subOf[g.sessionId]}`}>{g.studentNo}</Link>{g.resubmitted ? " (재제출)" : ""}{g.late ? " (마감 뒤)" : ""}</li>);
  return (
    <div className="space-y-1">
      <p>시작 안 함 {card.notStarted.length} · 진행 중 {card.inProgress} · 마감 지남 {card.overdue.length} · 돌려줌 {card.returned}</p>
      {card.notStarted.length ? <p className="text-xs">시작 안 함: {card.notStarted.join(", ")}</p> : null}
      {grade.length ? <><p className="font-semibold">채점 기다림 {card.toGrade.length}</p><ul className="flex flex-wrap gap-x-3">{grade}</ul></> : null}
    </div>
  );
}

function FlagList({ card }: { card: FlagCard }) {
  if (card.items.length === 0) return <p className="text-muted">확인이 필요한 대화가 없어요.</p>;
  return <ul className="space-y-1">{card.items.slice(0, 6).map((f) => <li key={`${f.sessionId}-${f.ts}`}><Link className="font-semibold underline" href={`${sessionHref(f.sessionId)}?tab=chat`}>{f.studentNo}</Link> · {f.kind} · {fmtTime(f.ts)}</li>)}</ul>;
}

function ErrorList({ errors }: { errors: CommonError[] }) {
  if (errors.length === 0) return <p className="text-muted">아직 모인 오답이 없어요.</p>;
  return <ol className="list-decimal space-y-1 pl-5">{errors.map((e) => <li key={e.key}>{e.label} <span className="text-muted">— 학생 {e.students}명 · {e.count}회</span></li>)}</ol>;
}

export default function FourCards({ board }: { board: ClassBoard }) {
  const { cards, classId } = board;
  const base = `card-${classId.slice(0, 8)}`;
  const sub = cards.submission;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card id={`${base}-stuck`} icon="🧗" title="막힌 학생" count={cards.stuck.students.length} tone="border-warn" next={cards.stuck.students[0]?.nextAction ?? "실시간 보드에서 학생별 단계를 살펴보세요."}><StuckList card={cards.stuck} /></Card>
      <Card id={`${base}-sub`} icon="📮" title="미제출·채점" count={sub.overdue.length + sub.toGrade.length} tone="border-brand" next={sub.toGrade.length ? "채점 기다림 학생 이름을 눌러 루브릭으로 채점하고 돌려주세요." : "마감이 지난 학생에게 지각 제출을 허용할지 정하세요."}><SubmissionList card={sub} subOf={board.submissionIdOf} /></Card>
      <Card id={`${base}-flag`} icon="🚩" title="확인할 AI 대화" count={cards.flags.items.length} tone="border-err" next="위기 신호는 바로 학생과 이야기하고, 학교 절차(Wee클래스 등)에 따라 연계하세요."><FlagList card={cards.flags} /></Card>
      <Card id={`${base}-err`} icon="🔁" title="공통 오답 상위 3" count={cards.errors.length} tone="border-line" next={cards.errors[0] ? `‘${cards.errors[0].label}’을(를) 반 전체에 짧게 짚어 주세요.` : "학생들이 계산값을 입력하면 모여요."}><ErrorList errors={cards.errors} /></Card>
    </div>
  );
}
