"use client";
/**
 * 학생 입장 카드 (2026-11-20 사용자 요청) — 번호·반 코드·PIN과 바로 입장 QR을 신용카드 크기(85.6×54 mm) 카드로 보여 주고 인쇄한다.
 * 코팅해 두었다가 수업 시작 때 번호대로 나눠 주면 학생은 태블릿으로 QR만 찍고 들어온다.
 * QR = <사이트>/login#c=…&n=…&p=… (lib/joinCard.ts). PIN은 이 화면을 닫으면 다시 볼 수 없으니 바로 인쇄한다.
 * 인쇄할 때는 카드만 나가도록 body 바로 아래에 인쇄용 사본을 두고 나머지는 숨긴다(globals.css .join-print).
 */
import { useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { joinCardUrl } from "@/lib/joinCard";

const noop = () => () => undefined;

export interface CardRow { studentNo: string; pin: string | null; error?: string }

/** QR을 svg 사각형으로 직접 그린다(외부 이미지·innerHTML 없이) */
function Qr({ text, size }: { text: string; size: string }) {
  const { n, d } = useMemo(() => {
    const m = QRCode.create(text, { errorCorrectionLevel: "M" }).modules;
    let path = "";
    for (let y = 0; y < m.size; y += 1) for (let x = 0; x < m.size; x += 1) if (m.data[y * m.size + x]) path += `M${x + 2} ${y + 2}h1v1h-1z`;
    return { n: m.size + 4, d: path };
  }, [text]);
  return (
    <svg viewBox={`0 0 ${n} ${n}`} style={{ width: size, height: size }} shapeRendering="crispEdges" role="img" aria-label="입장 QR 코드">
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

function Card({ origin, joinCode, row }: { origin: string; joinCode: string; row: CardRow }) {
  return (
    <div className="join-card flex items-center gap-[3mm] overflow-hidden rounded-[3mm] border-2 border-nav bg-white p-[3mm] text-nav" style={{ width: "85.6mm", height: "54mm" }}>
      {row.pin && origin ? <Qr text={joinCardUrl(origin, { code: joinCode, no: row.studentNo, pin: row.pin })} size="40mm" /> : <p className="w-[40mm] text-xs text-err">{row.error ?? "PIN 없음"}</p>}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[9pt] font-bold">🔬 가상실험실 입장 카드</p>
        <p className="mt-[2mm] text-[22pt] font-extrabold">{row.studentNo}</p>
        <p className="mt-[2mm] text-[8pt]">반 코드 <span className="font-mono font-bold">{joinCode}</span></p>
        <p className="text-[8pt]">PIN <span className="font-mono font-bold">{row.pin ?? "—"}</span></p>
        <p className="mt-[2mm] text-[7pt] text-muted">태블릿 카메라로 QR을 찍으면 바로 들어가요</p>
      </div>
    </div>
  );
}

function Sheet({ origin, joinCode, rows }: { origin: string; joinCode: string; rows: CardRow[] }) {
  return <div className="flex flex-wrap gap-[4mm]">{rows.map((r) => <Card key={r.studentNo} origin={origin} joinCode={joinCode} row={r} />)}</div>;
}

export default function JoinCards({ joinCode, rows, title }: { joinCode: string; rows: CardRow[]; title: string }) {
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const print = () => {
    document.body.classList.add("print-cards");
    const done = () => {
      document.body.classList.remove("print-cards");
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
  };
  if (rows.length === 0) return null;
  return (
    <div className="mt-3 rounded border-2 border-dashed border-brand p-3">
      <p className="text-sm font-bold">{title}</p>
      <p className="text-xs text-muted">카드를 인쇄해 코팅해 두었다가 수업 시작 때 번호대로 나눠 주세요. 카드를 잃어버리면 그 학생의 PIN을 재발급하면 옛 카드는 쓸 수 없어요.</p>
      <div className="mt-2"><Sheet origin={origin} joinCode={joinCode} rows={rows} /></div>
      <button type="button" className="tap mt-2 rounded bg-brand px-4 font-bold text-white" onClick={print}>🖨 입장 카드 인쇄</button>
      {origin ? createPortal(<div className="join-print"><Sheet origin={origin} joinCode={joinCode} rows={rows} /></div>, document.body) : null}
    </div>
  );
}
