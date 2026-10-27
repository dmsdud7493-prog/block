/** T-04 마감·지각 허용 조정 */
import { handler } from "@/lib/server/route";
import { assignmentUpdateSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";

export const POST = handler(assignmentUpdateSchema, ["teacher", "admin"], ({ assignmentId, dueAt, allowLate }, user) =>
  rpc("app_update_assignment", { p_teacher: user.id, p_assignment: assignmentId, p_due: dueAt, p_allow_late: allowLate }).then(() => ({ assignmentId })));
