/** 보호자 동의서 수령 표시 (R1) */
import { handler } from "@/lib/server/route";
import { consentSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";

export const POST = handler(consentSchema, ["teacher", "admin"], ({ studentId, onFile, date }, user) =>
  rpc("app_set_consent", { p_teacher: user.id, p_student: studentId, p_on_file: onFile, p_date: date ?? null }).then(() => ({ studentId, onFile })));
