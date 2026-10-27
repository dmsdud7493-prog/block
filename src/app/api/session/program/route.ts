/** 블록 프로그램 자동저장 — 버전 누적 (지침 3.4), 제출 후 잠금 */
import { handler } from "@/lib/server/route";
import { saveProgramSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";

export const PUT = handler(saveProgramSchema, ["student"], ({ sessionId, program, blockly, inquiry }, user) =>
  rpc<number>("app_save_program", { p_student: user.id, p_session: sessionId, p_program: program, p_blockly: blockly, p_inquiry: inquiry ?? null }).then((version) => ({ version })));
