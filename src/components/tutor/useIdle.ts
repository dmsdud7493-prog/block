"use client";
/** 마지막 활동 이후 경과 시간 — 의존값이 바뀌면 활동으로 본다 */
import { useEffect, useRef } from "react";

export function useIdle(deps: unknown[]) {
  const last = useRef<number>(0);
  const key = JSON.stringify(deps);
  useEffect(() => {
    last.current = Date.now();
  }, [key]);
  useEffect(() => {
    const touch = () => {
      last.current = Date.now();
    };
    window.addEventListener("keydown", touch);
    window.addEventListener("pointerdown", touch);
    return () => {
      window.removeEventListener("keydown", touch);
      window.removeEventListener("pointerdown", touch);
    };
  }, []);
  return { seconds: () => (last.current ? (Date.now() - last.current) / 1000 : 0) };
}
