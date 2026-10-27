import { handler } from "@/lib/server/route";
import { pinSchema } from "@/lib/server/schemas";
import { resetPin } from "@/lib/server/students";

export const POST = handler(pinSchema, ["teacher", "admin"], ({ studentId }, user) => resetPin(user.id, studentId).then((pin) => ({ pin })));
