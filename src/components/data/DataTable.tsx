"use client";
/**
 * 결과 데이터 표 (요구사항 7) — 실행이 끝나면 측정값을 바로 보여 주고, 계산값 칸은 학생이 채운다.
 */
import type { CalcRequest, Measurement } from "@/lib/engine/types";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { CalcEntry, RunRecord } from "@/components/lab/types";
import CalcCell from "./CalcCell";
import { fmtMeasure } from "@/lib/engine/format";
import { subjectLabel } from "@/lib/engine/subjectLabel";

interface Props {
  catalog: AnyCatalog;
  run: RunRecord;
  calc: Record<string, CalcEntry>;
  onCheck: (req: CalcRequest, value: number, unit: string, raw: string) => Promise<void>;
}

interface Group {
  trial: number;
  /** 화면에 보이는 시도 번호 — 기록이 있는 시도만 1, 2, 3 …(중탕에 넣기처럼 기록 없는 단계가 번호를 건너뛰지 않게, 2026-11-17 점검) */
  shown: number;
  subject: string;
  measurements: Measurement[];
  requests: CalcRequest[];
}

function groupRows(run: RunRecord): Group[] {
  const keyOf = (trial: number, subject: string) => `${trial}:${subject}`;
  const keys = [...new Set([...run.measurements, ...run.calcRequests].map((x) => keyOf(x.trial, x.subject)))];
  const trials = [...new Set(keys.map((k) => Number(k.split(":")[0])))].sort((a, b) => a - b);
  return keys.map((k) => {
    const [t, subject] = k.split(":");
    const trial = Number(t);
    return {
      trial,
      shown: trials.indexOf(trial) + 1,
      subject,
      measurements: run.measurements.filter((m) => m.trial === trial && m.subject === subject),
      requests: run.calcRequests.filter((c) => c.trial === trial && c.subject === subject),
    };
  });
}

const labelOf = subjectLabel;

function Row({ g, catalog, calc, onCheck }: { g: Group; catalog: AnyCatalog; calc: Record<string, CalcEntry>; onCheck: Props["onCheck"] }) {
  const measured = g.measurements.map((m) => `${m.label} ${fmtMeasure(m)} ${m.unit}`).join(" · ");
  return (
    <tr className="border-t border-line align-top">
      <td className="p-2 text-center">{g.shown}</td>
      <th scope="row" className="p-2 text-left font-semibold">{labelOf(catalog, g.subject)}</th>
      <td className="p-2 tabular-nums">{measured || "—"}</td>
      <td className="p-2">{g.requests.map((r) => <CalcField key={r.key} r={r} entry={calc[r.key]} onCheck={onCheck} />)}</td>
    </tr>
  );
}

function CalcField({ r, entry, onCheck }: { r: CalcRequest; entry: CalcEntry | undefined; onCheck: Props["onCheck"] }) {
  return (
    <div className="mb-1">
      <p className="text-xs font-semibold text-muted">{r.label}</p>
      <CalcCell request={r} entry={entry} onCheck={(v, u, raw) => onCheck(r, v, u, raw)} />
    </div>
  );
}

export default function DataTable({ catalog, run, calc, onCheck }: Props) {
  const groups = groupRows(run);
  if (groups.length === 0) return <p className="text-sm text-muted">이번 실행에서는 측정한 값이 없어요.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="text-left font-bold">📊 실험 {run.runNo}회차 결과 — 측정값은 기록되고, 계산값은 직접 구해서 입력해요</caption>
        <thead><tr className="bg-slate-100"><th scope="col" className="p-2">시도</th><th scope="col" className="p-2 text-left">대상</th><th scope="col" className="p-2 text-left">측정값</th><th scope="col" className="p-2 text-left">계산값 (직접 입력)</th></tr></thead>
        <tbody>{groups.map((g) => <Row key={`${g.trial}-${g.subject}`} g={g} catalog={catalog} calc={calc} onCheck={onCheck} />)}</tbody>
      </table>
    </div>
  );
}
