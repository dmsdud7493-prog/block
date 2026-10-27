"use client";
/** 접근성 있는 모달 — Esc로 닫기, 열릴 때 첫 입력에 포커스 */
import { useEffect, useRef } from "react";

export default function Modal({ labelledBy, onClose, children }: { labelledBy: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>("input, button, textarea, select");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
      <div ref={ref} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-panel p-4 shadow-xl">{children}</div>
    </div>
  );
}
