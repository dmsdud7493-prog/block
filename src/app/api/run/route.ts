/** 실행 — 예측이 없으면 403 prediction_required (지침 3.1, 서버 가드) */
import { handler } from "@/lib/server/route";
import { runSchema } from "@/lib/server/schemas";
import { runForStudent } from "@/lib/server/labService";

export const POST = handler(runSchema, ["student"], ({ sessionId, program }, user) => runForStudent(user.id, sessionId, program));
