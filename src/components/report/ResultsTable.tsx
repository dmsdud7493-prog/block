/** 보고서 결과 표 — 실험 기록에서 옮겨 온 측정값·계산값 (학생 보고서·교사 읽기 화면 공용) */
import type { ReportContent } from "@/lib/report/template";

const CELL = "border border-line px-2 py-1";

function Head({ columns }: { columns: string[] }) {
  return <thead><tr className="bg-[#eaf2fb] text-nav">{columns.map((c) => <th key={c} scope="col" className={`${CELL} text-left font-bold`}>{c}</th>)}</tr></thead>;
}

function Row({ cells, columns }: { cells: string[]; columns: string[] }) {
  return <tr className="odd:bg-white even:bg-[#f8fafc]">{cells.map((v, i) => <td key={columns[i] ?? i} className={`${CELL} ${i === 0 ? "font-semibold" : "tabular-nums"}`}>{v}</td>)}</tr>;
}

export default function ResultsTable({ table, caption }: { table: ReportContent["resultsTable"]; caption: string }) {
  if (table.rows.length === 0) return <p className="text-sm text-muted">아직 옮겨 올 결과가 없어요. 실험을 실행하고 표의 계산값을 확인해 보세요.</p>;
  const body = <tbody>{table.rows.map((r) => <Row key={r.join("|")} cells={r} columns={table.columns} />)}</tbody>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <Head columns={table.columns} />
        {body}
      </table>
    </div>
  );
}
