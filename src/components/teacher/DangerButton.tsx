"use client";
/**
 * 되돌릴 수 없는 삭제 (R10) — 브라우저 확인 창 대신 같은 자리에서 두 번 확인한다(스크린리더에도 읽힘).
 */
import { useState } from "react";

interface Props {
  label: string;
  warning: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
}

export default function DangerButton({ label, warning, confirmLabel, busy, onConfirm }: Props) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className="tap rounded border border-err px-2 text-sm text-err" onClick={() => setAsking(true)}>{label}</button>;
  return (
    <span role="group" aria-label={label} className="inline-flex flex-wrap items-center gap-2 rounded bg-red-50 p-1 text-sm">
      <span role="status" aria-live="polite">{warning}</span>
      <button type="button" disabled={busy} className="tap rounded bg-err px-3 font-bold text-white" onClick={onConfirm}>{confirmLabel}</button>
      <button type="button" className="tap rounded border border-line px-3" onClick={() => setAsking(false)}>취소</button>
    </span>
  );
}
