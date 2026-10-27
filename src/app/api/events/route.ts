/** 학습 이벤트 기록 — 교사 대시보드 원천 (D11). 학생은 자기 이벤트를 읽을 수 없다(RLS) */
import { handler } from "@/lib/server/route";
import { eventsSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";

export const POST = handler(eventsSchema, ["student"], ({ sessionId, events }, user) =>
  rpc<number>("app_log_events", { p_student: user.id, p_session: sessionId, p_events: events }).then((n) => ({ logged: n })));
