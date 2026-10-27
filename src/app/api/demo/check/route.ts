/** 데모 계산값 채점 — 정답값은 응답하지 않는다 (CLAUDE.md 규칙 3, 지침 5.3) */
import { demoCheckSchema } from "@/lib/server/schemas";
import { fail, ok } from "@/lib/server/respond";
import { checkValue } from "@/lib/server/simulation";

export async function POST(req: Request) {
  try {
    const parsed = demoCheckSchema.safeParse(await req.json());
    if (!parsed.success) return fail("invalid_input");
    const result = checkValue(parsed.data);
    if (!result) return fail("not_found", "이 칸은 이번 실행에서 계산할 값이 아니에요.");
    return ok(result);
  } catch {
    return fail("server_error");
  }
}
