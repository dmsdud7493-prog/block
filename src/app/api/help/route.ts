/**
 * 교사 "도와줄까?" (2026-11-18 사용자 요청, 지침 4.3 적시 도움)
 * - offer (교사): 막힌 학생에게 물음을 보낸다
 * - poll (학생): 아직 답하지 않은 물음이 있으면 받는다(학생 화면은 Realtime을 쓰지 않으므로 짧게 묻는다, verify P6).
 *   바로 앞 물음에도 답이 없었으면 repeat=true → 화난 선생님 말풍선(2026-11-18 사용자 요청, 0015: 1분 뒤 다시 보내기)
 * - answer (학생): "예, 도와주세요" / "아니요, 혼자 할 수 있어요"
 */
import { handler } from "@/lib/server/route";
import { helpSchema } from "@/lib/server/schemas";
import { rpc } from "@/lib/server/rpc";
import { createClient } from "@/lib/supabase/server";
import { readPending, type HelpOffer, type HelpPoll } from "@/lib/help/pending";

async function pending(sessionId: string): Promise<HelpPoll> {
  try {
    const db = await createClient();
    const { data } = await db.from("help_offers").select("id, answer, created_at").eq("session_id", sessionId)
      .order("created_at", { ascending: false }).limit(2);
    return readPending((data ?? []) as HelpOffer[], Date.now());
  } catch {
    return { offerId: null, repeat: false };
  }
}

export const POST = handler(helpSchema, ["teacher", "admin", "student"], async (input, user) => {
  if (input.action === "offer") {
    if (user.role === "student") throw new Error("forbidden");
    return { offerId: await rpc<string>("app_offer_help", { p_teacher: user.id, p_session: input.sessionId }) };
  }
  if (user.role !== "student") throw new Error("forbidden");
  if (input.action === "poll") return pending(input.sessionId);
  await rpc("app_answer_help", { p_student: user.id, p_offer: input.offerId, p_answer: input.answer });
  return { offerId: null, repeat: false };
});
