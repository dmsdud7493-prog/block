/**
 * Route Handler 공통 래퍼: JSON 파싱 → zod 검증 → 로그인·역할 확인 → 실행 → DB 게이트 오류를 HTTP로 변환.
 */
import "server-only";
import type { z } from "zod";
import { currentUser, type CurrentUser } from "./auth";
import { fail, gateCode, ok } from "./respond";

type Role = CurrentUser["role"];

export function handler<S extends z.ZodType, R>(
  schema: S,
  roles: Role[],
  fn: (input: z.infer<S>, user: CurrentUser) => Promise<R>,
) {
  return async (req: Request) => {
    try {
      const user = await currentUser();
      if (!user) return fail("unauthorized", "다시 로그인해 주세요.");
      if (!roles.includes(user.role)) return fail("forbidden");
      const parsed = schema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return fail("invalid_input");
      return ok(await fn(parsed.data, user));
    } catch (err) {
      const code = gateCode(err);
      return code ? fail(code, GATE_MESSAGES[code]) : fail("server_error");
    }
  };
}

const GATE_MESSAGES: Partial<Record<string, string>> = {
  prediction_required: "실행하기 전에 결과를 먼저 예상해 주세요.",
  consent_required: "보호자 동의서가 확인되면 실험을 시작할 수 있어요. 선생님께 알려 주세요.",
  reflection_required: "제출하기 전에 결론과 성찰 질문(3개 이상)을 채워 주세요.",
  late_not_allowed: "마감이 지나 제출할 수 없어요. 선생님께 여쭤 보세요.",
  session_locked: "제출한 실험은 고칠 수 없어요. 선생님이 돌려주면 다시 고칠 수 있어요.",
  forbidden: "이 작업을 할 권한이 없어요.",
};
