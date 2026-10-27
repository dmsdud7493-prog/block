"use client";
/**
 * 프레임 재생기 — 0.5×/1×/2×, 일시정지·처음부터·블록 하나만 다시 보기 (프로토타입 previewBlock 계승).
 * 실행이 바뀌면 이 훅을 쓰는 컴포넌트를 key={runNo}로 다시 마운트한다(효과 안에서 상태를 되돌리지 않기 위해).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Frame } from "@/lib/engine/types";

export const BASE_STEP_MS = 1600;

export function useFramePlayer(frames: Frame[], onFinish?: () => void) {
  const [index, setIndex] = useState(frames.length ? 0 : -1);
  const [playing, setPlaying] = useState(frames.length > 0);
  const [speed, setSpeed] = useState(1);
  const [stopAt, setStopAt] = useState<number | null>(null);
  const finishRef = useRef(onFinish);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!playing) return undefined;
    const last = stopAt ?? frames.length - 1;
    if (index >= last) {
      const t = setTimeout(() => {
        setPlaying(false);
        if (stopAt === null) finishRef.current?.();
      }, BASE_STEP_MS / speed);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIndex((i) => i + 1), BASE_STEP_MS / speed);
    return () => clearTimeout(t);
  }, [playing, index, speed, frames.length, stopAt]);

  const replay = useCallback(() => {
    setStopAt(null);
    setIndex(0);
    setPlaying(true);
  }, []);

  const showBlock = useCallback((blockId: string) => {
    const i = frames.findIndex((f) => f.blockId === blockId);
    if (i < 0) return;
    setIndex(i);
    setStopAt(i);
    setPlaying(false);
  }, [frames]);

  return { index, frame: index >= 0 ? frames[index] : null, playing, speed, setSpeed, pause: () => setPlaying(false), resume: () => setPlaying(true), replay, showBlock };
}
