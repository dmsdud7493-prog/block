/** 예측 저장(지침 3.1)과 결과 후 비교 설명(지침 3.3) */
import { handler } from "@/lib/server/route";
import { predictSchema } from "@/lib/server/schemas";
import { predictForStudent } from "@/lib/server/labService";

export const POST = handler(predictSchema, ["student"], (input, user) => predictForStudent(user.id, input));
