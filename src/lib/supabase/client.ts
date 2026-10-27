"use client";
/** 브라우저 클라이언트 — 교사 대시보드 Realtime 구독에만 쓴다 (verify P6) */
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export function createBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
