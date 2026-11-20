/** 반 전체 PIN 재발급 — 새 PIN은 이 응답에서 한 번만 보여 준다(교사가 입장 카드로 인쇄해 나눠 줌) */
import { handler } from "@/lib/server/route";
import { classIdSchema } from "@/lib/server/schemas";
import { resetClassPins } from "@/lib/server/students";

export const POST = handler(classIdSchema, ["teacher", "admin"], ({ classId }, user) => resetClassPins(user.id, classId).then((created) => ({ created })));
