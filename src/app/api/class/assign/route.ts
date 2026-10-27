import { handler } from "@/lib/server/route";
import { assignSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";

export const POST = handler(assignSchema, ["teacher", "admin"], (a, user) =>
  rpc<string>("app_assign", { p_teacher: user.id, p_class: a.classId, p_slug: a.slug, p_due: a.dueAt, p_allow_late: a.allowLate, p_settings: a.settings ?? {} }).then((id) => ({ assignmentId: id })));
