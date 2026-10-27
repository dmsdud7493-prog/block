/** 교과서 참고 자료 표 (예: 온도별 용해도) — 계산에 쓰는 공개 자료 */
import type { ReferenceTable } from "@/lib/engine/types";

function RefRow({ row }: { row: (string | number)[] }) {
  return <tr>{row.map((c, i) => (i === 0 ? <th key={i} scope="row" className="px-1 text-left">{c}</th> : <td key={i} className="px-1 text-center">{c}</td>))}</tr>;
}

export default function ReferencePanel({ table }: { table: ReferenceTable }) {
  return (
    <div className="overflow-x-auto rounded border border-line bg-panel p-2">
      <table className="w-full text-xs tabular-nums">
        <caption className="text-left text-sm font-bold">📚 {table.title}</caption>
        <thead><tr>{table.columns.map((c) => <th key={c} scope="col" className="px-1">{c}</th>)}</tr></thead>
        <tbody>{table.rows.map((r) => <RefRow key={String(r[0])} row={r} />)}</tbody>
      </table>
      <p className="mt-1 text-xs text-muted">{table.caption}</p>
    </div>
  );
}
