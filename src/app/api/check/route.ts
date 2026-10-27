/** 계산값 채점 (지침 5.3, FORMATIVE) — 응답에 정답값 없음 */
import { handler } from "@/lib/server/route";
import { checkSchema } from "@/lib/server/schemas";
import { checkForStudent } from "@/lib/server/labService";

export const POST = handler(checkSchema, ["student"], (input, user) => checkForStudent(user.id, input));
