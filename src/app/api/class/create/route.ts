import { handler } from "@/lib/server/route";
import { classCreateSchema } from "@/lib/server/schemas";
import { rpcRow } from "@/lib/server/rpc";

export const POST = handler(classCreateSchema, ["teacher", "admin"], ({ name }, user) =>
  rpcRow<{ id: string; join_code: string }>("app_create_class", { p_teacher: user.id, p_name: name }).then((c) => ({ classId: c.id, joinCode: c.join_code })));
