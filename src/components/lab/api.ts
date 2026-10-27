/** fetch 래퍼 — 모든 API는 {data, error, status} 형식 */
export interface ApiResult<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

export async function postJson<T>(url: string, body: unknown, method = "POST"): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json()) as ApiResult<T>;
    return { data: json.data ?? null, error: json.error ?? null };
  } catch {
    return { data: null, error: { code: "network", message: "연결이 잠시 끊겼어요. 잠시 후 다시 시도해 주세요." } };
  }
}
