"use client";
/**
 * 교사 화면 실시간 갱신 — Supabase Realtime(events·submissions INSERT/UPDATE)을 구독해 서버 데이터를 다시 그린다.
 * 학생 화면에서는 구독하지 않는다 (verify P6). RLS가 적용되므로 자기 반 이벤트만 온다.
 * Realtime을 쓸 수 없으면(설정 없음·학교망 차단) 30초마다 새로고침으로 대신한다.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const THROTTLE_MS = 3000;
const POLL_MS = 30_000;

type Status = "connecting" | "live" | "polling";
const LABEL: Record<Status, string> = { connecting: "연결 중…", live: "🟢 실시간", polling: "🟡 30초마다 새로고침" };

export default function LiveRefresh({ classIds, generatedAt }: { classIds: string[]; generatedAt: number }) {
  const { refresh } = useRouter();
  const [status, setStatus] = useState<Status>(isSupabaseConfigured() ? "connecting" : "polling");
  const last = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = classIds.join(",");

  useEffect(() => {
    const kick = () => {
      const wait = Math.max(0, last.current + THROTTLE_MS - Date.now());
      if (pending.current) return;
      pending.current = setTimeout(() => {
        pending.current = null;
        last.current = Date.now();
        refresh();
      }, wait);
    };
    const poll = setInterval(() => refresh(), POLL_MS);
    if (!isSupabaseConfigured() || !key) return () => clearInterval(poll);
    const db = createBrowserSupabase();
    const ids = key.split(",");
    const channel = ids.reduce((ch, id) => ch
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "events", filter: `class_id=eq.${id}` }, kick), db.channel(`teacher-${key}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, kick)
      .subscribe((s) => setStatus(s === "SUBSCRIBED" ? "live" : "polling"));
    return () => {
      clearInterval(poll);
      if (pending.current) clearTimeout(pending.current);
      void db.removeChannel(channel);
    };
  }, [key, refresh]);

  const time = new Date(generatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return <p className="text-xs text-muted" role="status" aria-live="polite">{LABEL[status]} · 마지막 갱신 {time}</p>;
}
