/**
 * AI 튜터 (요구사항 1·3, 지침 4.x·5.x). 체험 모드는 로그인 없이 규칙 기반(또는 DEMO_TUTOR_ENABLED일 때 Claude),
 * 세션 모드는 학생 인증 후 대화를 저장하고 위험 신호를 교사에게 알린다.
 */
import { tutorSchema } from "@/lib/server/schemas";
import { fail, gateCode, ok } from "@/lib/server/respond";
import { currentUser } from "@/lib/server/auth";
import { allow } from "@/lib/server/rateLimit";
import { tutorTurn } from "@/lib/tutor/service";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const parsed = tutorSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("invalid_input");
    const input = parsed.data;
    const user = input.mode === "session" ? await currentUser() : null;
    if (input.mode === "session" && (!user || user.role !== "student" || !input.sessionId)) return fail("unauthorized");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!allow(`tutor:${user?.id ?? ip}`, input.mode === "demo" ? 15 : 30, 60_000)) return fail("rate_limited", "잠깐 쉬었다가 다시 물어봐 주세요.");
    return ok(await tutorTurn(input, user?.id ?? null));
  } catch (err) {
    const code = gateCode(err);
    return code ? fail(code) : fail("server_error");
  }
}
