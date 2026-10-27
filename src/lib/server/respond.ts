/** Route Handler 응답 형식 {data, error, status} (architecture.md §5) */
import "server-only";
import { NextResponse } from "next/server";

export type ErrorCode =
  | "unauthorized" | "forbidden" | "not_found" | "invalid_input"
  | "prediction_required" | "consent_required" | "reflection_required" | "late_not_allowed"
  | "session_locked" | "rate_limited" | "upstream_unavailable" | "server_error";

const STATUS: Record<ErrorCode, number> = {
  unauthorized: 401, forbidden: 403, not_found: 404, invalid_input: 422,
  prediction_required: 403, consent_required: 403, reflection_required: 422, late_not_allowed: 403,
  session_locked: 409, rate_limited: 429, upstream_unavailable: 503, server_error: 500,
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null, status }, { status });
}

export function fail(code: ErrorCode, message?: string) {
  const status = STATUS[code];
  return NextResponse.json({ data: null, error: { code, message: message ?? code }, status }, { status });
}

/** DB 함수가 던진 예외 메시지에서 알려진 게이트 코드를 찾는다 (ADR-P03) */
export function gateCode(err: unknown): ErrorCode | null {
  const text = err instanceof Error ? err.message : typeof err === "object" && err ? JSON.stringify(err) : String(err);
  const known: ErrorCode[] = ["prediction_required", "consent_required", "reflection_required", "late_not_allowed", "session_locked", "forbidden", "not_found", "invalid_input", "upstream_unavailable"];
  if (text.includes("invalid_join_code")) return "not_found";
  return known.find((c) => text.includes(c)) ?? null;
}
