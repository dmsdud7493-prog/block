/**
 * 데모 실행 (로그인·저장 없음, ADR-P06). 실제 세션과 같은 서버 시뮬레이션을 쓴다.
 * 지침 3.1: 예측이 하나도 없으면 실행하지 않는다 (prediction_required).
 */
import { demoRunSchema } from "@/lib/server/schemas";
import { fail, ok } from "@/lib/server/respond";
import { runProgram } from "@/lib/server/simulation";

export async function POST(req: Request) {
  try {
    const parsed = demoRunSchema.safeParse(await req.json());
    if (!parsed.success) return fail("invalid_input");
    const { slug, seed, runNo, program, predictions } = parsed.data;
    if (predictions.length === 0) return fail("prediction_required", "실행 전에 결과를 먼저 예상해 주세요.");
    const result = runProgram(slug, program, seed, runNo);
    return ok({ runNo, ...result });
  } catch {
    return fail("server_error");
  }
}
