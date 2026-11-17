"use client";
/** 효과음 켜기/끄기 — 처음에는 켜짐(사용자 요청 2026-11-17). 학생이 바꾸면 이 브라우저에 기억한다(저장이 막혀도 동작) */
import { useCallback, useEffect, useState } from "react";

const KEY = "lab-sound";

export function useSoundPref(): [boolean, () => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === "off") setOn(false); // eslint-disable-line react-hooks/set-state-in-effect -- 저장된 선택을 처음 한 번 불러온다
    } catch {
      // 저장소를 쓸 수 없으면 기본(켜짐)
    }
  }, []);
  const toggle = useCallback(() => {
    setOn((v) => {
      try {
        window.localStorage.setItem(KEY, v ? "off" : "on");
      } catch {
        // 기억하지 못해도 이번 화면에서는 바뀐다
      }
      return !v;
    });
  }, []);
  return [on, toggle];
}
