/** 서버 함수(app_*) 호출 — service_role로만 (ADR-P07). DB 게이트 오류는 메시지에 코드가 담겨 route.ts가 HTTP로 바꾼다 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const GATES = /\b(forbidden|not_found|invalid_input|prediction_required|consent_required|reflection_required|late_not_allowed|session_locked|invalid_rubric|not_submitted|invalid_join_code|upstream_unavailable)\b/;

/** 알려진 게이트 오류는 그대로, 그 밖의 내부 오류는 메시지를 숨긴다 */
export function normalizeError(e: unknown): Error {
  return e instanceof Error && GATES.test(e.message) ? e : new Error("server_error");
}

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  try {
    const { data, error } = await createAdminClient().rpc(fn, args);
    if (error) throw new Error(`${error.message} ${error.details ?? ""}`);
    return data as T;
  } catch (e) {
    // 네트워크 오류 등은 내부 메시지를 숨기고 upstream_unavailable로 통일
    if (e instanceof Error && GATES.test(e.message)) throw e;
    throw new Error("upstream_unavailable");
  }
}

export function rpcRow<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  return rpc<T | T[]>(fn, args).then((data) => {
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("not_found");
    return row;
  });
}
