"use client";
/**
 * 접근성 있는 모달 (KWCAG 2.1.1·2.4.3) — 열리면 첫 입력에 포커스, Tab/Shift+Tab은 모달 안에서만 돌고,
 * Esc로 닫으며, 닫히면 열기 전 포커스가 있던 곳으로 돌아간다.
 */
import { useEffect, useRef } from "react";

const FOCUSABLE = "a[href], input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

function trap(e: KeyboardEvent, box: HTMLElement | null) {
  const items = box ? Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
  if (items.length === 0) return;
  const [first, last] = [items[0], items[items.length - 1]];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

const BACKDROP = "bg-slate-900/50";
const PANEL = "max-w-lg rounded-xl bg-panel p-4 shadow-xl";

/** backdrop·panel을 주면 기본 겉모양 대신 그것을 쓴다(예측 카드 창) */
export default function Modal({ labelledBy, onClose, children, backdrop = BACKDROP, panel = PANEL }: { labelledBy: string; onClose: () => void; children: React.ReactNode; backdrop?: string; panel?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, button, textarea, select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") trap(e, ref.current);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${backdrop}`}>
      <div ref={ref} className={`max-h-[90vh] w-full overflow-y-auto ${panel}`}>{children}</div>
    </div>
  );
}
