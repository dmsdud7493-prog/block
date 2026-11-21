"use client";
/** 인쇄(또는 PDF로 저장) 단추 */
export default function PrintButton({ label = "🖨 인쇄 · PDF로 저장" }: { label?: string }) {
  return <button type="button" className="tap rounded-lg border-2 border-brand bg-brand px-4 text-sm font-bold text-white shadow-sm print:hidden" onClick={() => window.print()}>{label}</button>;
}
