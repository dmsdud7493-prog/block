"use client";
/**
 * 제출한 뒤 기다리는 동안 — 선생님이 돌려주거나 채점을 끝내면 화면을 다시 그린다(20초마다 짧게 묻기, 창이 가려지면 쉼).
 * 학생 화면은 Realtime을 쓰지 않는다(verify P6).
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "./api";

const POLL_MS = 20_000;

export default function StatusWatch({ sessionId, status, returnedAt }: { sessionId: string; status: string; returnedAt: string | null }) {
  const { refresh } = useRouter();
  useEffect(() => {
    if (status !== "submitted" && status !== "resubmitted") return undefined;
    const check = async () => {
      try {
        if (document.hidden) return;
        const res = await postJson<{ status: string; returnedAt: string | null }>("/api/session/status", { sessionId });
        if (res.data && (res.data.status !== status || res.data.returnedAt !== returnedAt)) refresh();
      } catch {
        // 다음에 다시 묻는다
      }
    };
    const id = setInterval(() => void check(), POLL_MS);
    return () => clearInterval(id);
  }, [sessionId, status, returnedAt, refresh]);
  return null;
}
