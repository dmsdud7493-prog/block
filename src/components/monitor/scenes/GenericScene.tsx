"use client";
/** 공통 장면 — 실험별 장면이 없을 때 이벤트 문구와 온도·상태를 크게 보여 준다 */
import type { SimEvent } from "@/lib/engine/types";

function pickTemp(state: unknown, event: SimEvent | null): number | null {
  const fromEvent = event && typeof event.temp === "number" ? event.temp : null;
  if (fromEvent !== null) return fromEvent;
  const s = state as Record<string, unknown> | null;
  return s && typeof s.temp === "number" ? s.temp : null;
}

export default function GenericScene({ state, event }: { state: unknown; event: SimEvent | null }) {
  const temp = pickTemp(state, event);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      {temp !== null ? <p className="text-4xl font-bold tabular-nums" aria-label={`온도 ${temp.toFixed(1)}도`}>🌡️ {temp.toFixed(1)} ℃</p> : null}
      <p className="text-lg">{event?.note ?? "실험 준비 중"}</p>
    </div>
  );
}
