"use client";
/**
 * T-04 실시간 보드 (지침 5.1·1.4 교사 뷰): 학생 행마다 현재 단계·체류 시간·실행·계산값·예측 일치·AI 대화·플래그.
 * 정렬 버튼은 aria-sort로 상태를 알린다. 학생 번호를 누르면 블록·그래프·대화 탭(학생 상세)으로 간다.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import type { StudentFold } from "@/lib/events/fold";
import { STEP_LABEL } from "@/lib/events/types";

type Col = "studentNo" | "step" | "dwellSec" | "runs" | "calc" | "pred" | "ai" | "status";

const STATUS_LABEL: Record<StudentFold["status"], string> = { in_progress: "진행 중", submitted: "제출", returned: "돌려줌(고치는 중)", resubmitted: "재제출" };
const STEP_ORDER = Object.keys(STEP_LABEL);
const maxWrong = (f: StudentFold) => Math.max(0, ...Object.values(f.openCalcWrong));

const VALUE: Record<Col, (f: StudentFold) => number | string> = {
  studentNo: (f) => f.studentNo,
  step: (f) => STEP_ORDER.indexOf(f.step),
  dwellSec: (f) => f.dwellSec,
  runs: (f) => f.runs,
  calc: (f) => f.calcCorrect * 100 - maxWrong(f),
  pred: (f) => f.predictionsMatched - f.predictionsMismatched,
  ai: (f) => f.aiReplies,
  status: (f) => f.status,
};

const HEAD: { col: Col; label: string }[] = [
  { col: "studentNo", label: "학번" }, { col: "step", label: "단계" }, { col: "dwellSec", label: "머문 시간" }, { col: "runs", label: "실행" },
  { col: "calc", label: "계산값" }, { col: "pred", label: "예상 vs 결과" }, { col: "ai", label: "AI 대화" }, { col: "status", label: "상태" },
];

function compare(a: StudentFold, b: StudentFold, col: Col): number {
  const [x, y] = [VALUE[col](a), VALUE[col](b)];
  return typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ko", { numeric: true });
}

function SortHead({ col, label, sort, onSort }: { col: Col; label: string; sort: { col: Col; dir: 1 | -1 }; onSort: (c: Col) => void }) {
  const active = sort.col === col;
  const aria = active ? (sort.dir === 1 ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={aria} className="px-2 py-1 text-left">
      <button type="button" className="tap font-semibold" onClick={() => onSort(col)}>{label} <span aria-hidden="true">{active ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span></button>
    </th>
  );
}

function Row({ f, subId }: { f: StudentFold; subId?: string }) {
  const wrong = maxWrong(f);
  return (
    <tr className={f.stuck.length ? "bg-amber-50" : ""}>
      <th scope="row" className="px-2 py-1 text-left"><Link className="underline" href={`/dashboard/sessions/${f.sessionId}`}>{f.studentNo}</Link>{f.stuck.length ? <span className="ml-1 rounded bg-amber-200 px-1 text-xs" title={f.stuck.map((s) => s.text).join(" / ")}>막힘</span> : null}</th>
      <td className="px-2 py-1">{STEP_LABEL[f.step]}</td>
      <td className="px-2 py-1 tabular-nums">{f.step === "submitted" ? "—" : `${Math.round(f.dwellSec / 60)}분`}</td>
      <td className="px-2 py-1 tabular-nums">{f.runs}{f.simErrorStreak ? ` (오류 연속 ${f.simErrorStreak})` : ""}</td>
      <td className="px-2 py-1 tabular-nums">✓{f.calcCorrect}{wrong ? ` · 재시도 ${wrong}` : ""}</td>
      <td className="px-2 py-1 tabular-nums">같음 {f.predictionsMatched} · 다름 {f.predictionsMismatched}</td>
      <td className="px-2 py-1 tabular-nums">{f.aiReplies}{f.flagged ? <span className="ml-1 text-err">🚩{f.flagged}</span> : null}</td>
      <td className="px-2 py-1">{subId ? <Link className="underline" href={`/dashboard/submissions/${subId}`}>{STATUS_LABEL[f.status]}</Link> : STATUS_LABEL[f.status]}{f.late ? " · 마감 뒤" : ""}</td>
    </tr>
  );
}

export default function LiveBoard({ folds, submissionIdOf, title }: { folds: StudentFold[]; submissionIdOf: Record<string, string>; title: string }) {
  const [sort, setSort] = useState<{ col: Col; dir: 1 | -1 }>({ col: "studentNo", dir: 1 });
  const rows = useMemo(() => [...folds].sort((a, b) => compare(a, b, sort.col) * sort.dir), [folds, sort]);
  const onSort = (col: Col) => setSort((s) => ({ col, dir: s.col === col ? (s.dir === 1 ? -1 : 1) : 1 }));
  if (folds.length === 0) return <p className="text-sm text-muted">아직 이 실험을 시작한 학생이 없어요.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="text-left text-sm font-semibold">{title} — 학생 {folds.length}명 (열 이름을 누르면 정렬돼요)</caption>
        <thead className="border-b border-line"><tr>{HEAD.map((h) => <SortHead key={h.col} col={h.col} label={h.label} sort={sort} onSort={onSort} />)}</tr></thead>
        <tbody className="divide-y divide-line">{rows.map((f) => <Row key={f.sessionId} f={f} subId={submissionIdOf[f.sessionId]} />)}</tbody>
      </table>
    </div>
  );
}
