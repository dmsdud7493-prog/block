/** 학생 일괄 생성 — PIN은 이 응답에서 한 번만 보여 준다 (교사가 출력해 나눠 줌) */
import { handler } from "@/lib/server/route";
import { studentsSchema } from "@/lib/server/schemas";
import { createStudentsForTeacher } from "@/lib/server/students";

export const POST = handler(studentsSchema, ["teacher", "admin"], ({ classId, studentNos }, user) =>
  createStudentsForTeacher(user.id, classId, studentNos).then((created) => ({ created })));
