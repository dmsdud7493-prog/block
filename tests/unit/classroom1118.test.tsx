// @vitest-environment jsdom
/**
 * 2026-11-18 한 반 28명·갤럭시탭 점검 — 자동 저장 묶기(4초)·화면 숨김 즉시 저장, block_edit 기록 15초 간격.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const calls: { url: string; body: unknown }[] = [];
vi.mock("@/components/lab/api", () => ({
  postJson: vi.fn(async (url: string, body: unknown) => {
    calls.push({ url, body });
    return { data: null, error: null };
  }),
}));

import { useAutosave } from "@/components/lab/useAutosave";
import { sessionBackend, type LabBackend } from "@/components/lab/backend";
import type { Program } from "@/lib/engine/types";
import type { LabState } from "@/components/lab/types";

const inquiry = {} as LabState["inquiry"];
const prog = (n: number) => ({ steps: [], n }) as unknown as Program;

beforeEach(() => {
  vi.useFakeTimers();
  calls.length = 0;
});
afterEach(() => vi.useRealTimers());

describe("useAutosave", () => {
  const fake = () => ({ saveProgram: vi.fn(async () => undefined) }) as unknown as LabBackend & { saveProgram: ReturnType<typeof vi.fn> };

  it("첫 렌더는 저장하지 않고, 연달아 바뀌면 마지막 것만 4초 뒤 한 번 저장한다", () => {
    const b = fake();
    const { rerender } = renderHook(({ p, v }) => useAutosave(b, p, null, inquiry, v), { initialProps: { p: prog(0), v: 0 } });
    expect(b.saveProgram).not.toHaveBeenCalled();
    for (let i = 1; i <= 5; i += 1) {
      rerender({ p: prog(i), v: i });
      vi.advanceTimersByTime(1000);
    }
    expect(b.saveProgram).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4000);
    expect(b.saveProgram).toHaveBeenCalledTimes(1);
    expect(b.saveProgram.mock.calls[0][0]).toEqual(prog(5));
  });

  it("화면을 가리거나 flush(실행)하면 기다리지 않고 바로 저장한다", () => {
    const b = fake();
    const { rerender, result } = renderHook(({ p, v }) => useAutosave(b, p, null, inquiry, v), { initialProps: { p: prog(0), v: 0 } });
    rerender({ p: prog(1), v: 1 });
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(b.saveProgram).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    rerender({ p: prog(2), v: 2 });
    result.current();
    expect(b.saveProgram).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5000);
    expect(b.saveProgram).toHaveBeenCalledTimes(2);
  });
});

describe("sessionBackend block_edit 간격", () => {
  it("15초 안의 block_edit은 한 번만 남기고 다른 이벤트는 그대로 남긴다", () => {
    const b = sessionBackend("s1");
    b.logEvent("block_edit", { n: 1 });
    b.logEvent("block_edit", { n: 2 });
    b.logEvent("hint_opened" as never, { n: 3 });
    vi.advanceTimersByTime(2000);
    vi.advanceTimersByTime(15_000);
    b.logEvent("block_edit", { n: 4 });
    vi.advanceTimersByTime(2000);
    const sent = calls.filter((c) => c.url === "/api/events").flatMap((c) => (c.body as { events: { type: string; payload: { n: number } }[] }).events);
    expect(sent.map((e) => e.payload.n)).toEqual([1, 3, 4]);
  });
});
