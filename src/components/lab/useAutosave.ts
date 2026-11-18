"use client";
/**
 * 블록·탐구 카드 자동저장 (지침 3.4: 버전은 덮어쓰지 않고 누적).
 * 2026-11-18 수업 전 점검: 1.5초마다 저장하면 한 학생이 한 차시에 수백 버전을 쌓아 무료 DB(500 MB)를 넘을 수 있다.
 * → 마지막 변경 뒤 4초 동안 더 바뀌지 않으면 저장하고, 창을 가리거나 떠날 때·실험을 실행할 때는 바로 저장한다.
 */
import { useCallback, useEffect, useRef } from "react";
import type { Program } from "@/lib/engine/types";
import type { LabBackend } from "./backend";
import type { LabState } from "./types";

const DEBOUNCE_MS = 4000;
type Pending = { program: Program; blockly: object | null; inquiry: LabState["inquiry"] };

export function useAutosave(backend: LabBackend, program: Program, blockly: object | null, inquiry: LabState["inquiry"], version: number): () => void {
  const pending = useRef<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    if (p) void backend.saveProgram(p.program, p.blockly, p.inquiry);
  }, [backend]);

  // 첫 렌더(불러온 상태)는 다시 저장하지 않는다
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = { program, blockly, inquiry };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [program, blockly, inquiry, version, flush]);

  // 탭을 가리거나(다른 앱·화면 끄기) 떠나거나 화면이 바뀔 때 남은 변경을 바로 저장
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  return flush;
}
