/** 간단한 인스턴스 메모리 속도 제한 (체험 모드 튜터 남용 방지 — 서버리스에서는 최선 노력) */
import "server-only";

let hits = new Map<string, number[]>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  hits = new Map(hits).set(key, [...recent, now]);
  if (hits.size > 5000) hits = new Map([...hits].slice(-1000));
  return true;
}
