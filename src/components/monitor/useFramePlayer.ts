"use client";
/**
 * 프레임 재생기 — 0.5×/1×/2×, 일시정지·처음부터·블록 하나만 다시 실행 (프로토타입 previewBlock 계승).
 * 블록 하나만 실행: 그 블록 바로 앞 상태를 보여 준 뒤 곧바로 그 블록의 행동(손·물줄기·차오름)을 재생하고 멈춘다.
 * 실행이 바뀌면 이 훅을 쓰는 컴포넌트를 key={runNo}로 다시 마운트한다(효과 안에서 상태를 되돌리지 않기 위해).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Frame } from "@/lib/engine/types";

export const BASE_STEP_MS = 1600;
/** 블록 하나만 실행할 때 앞 상태를 잠깐 보여 주는 시간 */
const LEAD_MS = 250;

export function useFramePlayer(frames: Frame[], onFinish?: () => void) {
  const [index, setIndex] = useState(frames.length ? 0 : -1);
  const [playing, setPlaying] = useState(frames.length > 0);
  const [speed, setSpeed] = useState(1);
  const [stopAt, setStopAt] = useState<number | null>(null);
  const finishRef = useRef(onFinish);
  // 블록 하나만 실행할 때 "앞 상태"를 보여 주는 중 — 화면은 전환 없이 그 상태로 바로 바뀐다(lab-snap)
  const [lead, setLead] = useState(false);

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
    const t = setTimeout(() => {
      setLead(false);
      setIndex((i) => i + 1);
    }, lead ? LEAD_MS : BASE_STEP_MS / speed);
    return () => clearTimeout(t);
  }, [playing, index, speed, frames.length, stopAt, lead]);

  const replay = useCallback(() => {
    setLead(false);
    setStopAt(null);
    setIndex(0);
    setPlaying(true);
  }, []);

  /** 이 블록의 행동만 다시 실행한다. 실행 기록에 없는 블록이면 false */
  const playBlock = useCallback((blockId: string) => {
    const first = frames.findIndex((f) => f.blockId === blockId);
    if (first < 0) return false;
    const last = frames.findLastIndex((f, i) => i >= first && f.blockId === blockId);
    setLead(true);
    setIndex(first - 1);
    setStopAt(last);
    setPlaying(true);
    return true;
  }, [frames]);

  return { index, frame: index >= 0 ? frames[index] : null, playing, speed, setSpeed, pause: () => setPlaying(false), resume: () => setPlaying(true), replay, playBlock, lead };
}
