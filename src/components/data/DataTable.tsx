"use client";
/**
 * 결과 데이터 표 (요구사항 7) — 실행이 끝나면 측정값을 바로 보여 주고, 계산값 칸은 학생이 채운다.
 */
import type { CalcRequest, Measurement } from "@/lib/engine/types";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { CalcEntry, RunRecord } from "@/components/lab/types";
import CalcCell from "./CalcCell";
import { fmtNum } from "@/lib/engine/format";

interface Props {
  catalog: AnyCatalog;
  run: RunRecord;
  calc: Record<string, CalcEntry>;
  onCheck: (req: CalcRequest, value: number, unit: string) => Promise<void>;
}

interface Group {
  trial: number;
  subject: string;
  measurements: Measurement[];
  requests: CalcRequest[];
}

function groupRows(run: RunRecord): Group[] {
  const keyOf = (trial: number, subject: string) => `${trial}:${subject}`;
  const keys = [...new Set([...run.measurements, ...run.calcRequests].map((x) => keyOf(x.trial, x.subject)))];
  return keys.map((k) => {
    const [t, subject] = k.split(":");
    const trial = Number(t);
    return {
      trial,
      subject,
      measurements: run.measurements.filter((m) => m.trial === trial && m.subject === subject),
      requests: run.calcRequests.filter((c) => c.trial === trial && c.subject === subject),
    };
  });
}

const labelOf = (catalog: AnyCatalog, id: string) => catalog.items.find((i) => i.id === id)?.label ?? id;

function Row({ g, catalog, calc, onCheck }: { g: Group; catalog: AnyCatalog; calc: Record<string, CalcEntry>; onCheck: Props["onCheck"] }) {
  const measured = g.measurements.map((m) => `${m.label} ${fmtNum(m.value)} ${m.unit}`).join(" · ");
  return (
    <tr className="border-t border-line align-top">
      <td className="p-2 text-center">{g.trial}</td>
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
      <CalcCell request={r} entry={entry} onCheck={(v, u) => onCheck(r, v, u)} />
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
