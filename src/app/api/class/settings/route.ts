/** 교사 설정 (지침 2.4·4.4): 편집 중 힌트 수준, 말투, 실행 횟수 제한, 변인 근거 게이트 */
import { handler } from "@/lib/server/route";
import { classSettingsSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";

export const POST = handler(classSettingsSchema, ["teacher", "admin"], ({ classId, settings }, user) =>
  rpc("app_update_class_settings", { p_teacher: user.id, p_class: classId, p_settings: settings }).then(() => ({ classId })));
