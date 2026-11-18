/**
 * 학생 화면 "도와줄까?" 물음 판단 (2026-11-18 사용자 요청, 지침 4.3)
 * - 맨 끝 물음이 답 없이 10분 안이면 말풍선을 띄운다
 * - 교사는 1분 동안 답이 없으면 다시 보낼 수 있다(0015). 바로 앞 물음에도 답이 없었으면 repeat → 화난 선생님 말풍선
 */
const OPEN_MS = 10 * 60 * 1000;
/** 바로 앞 물음도 답 없이 이만큼 안에 있었으면 "두 번째 물음"(화난 선생님 말풍선) */
const REPEAT_MS = 10 * 60 * 1000;

export interface HelpOffer { id: string; answer: string | null; created_at: string }
export interface HelpPoll { offerId: string | null; repeat: boolean }

/** 최근 두 물음으로 판단: 맨 끝 물음이 열려 있고, 그 앞 물음에도 답이 없었으면 다시 물은 것 */
export function readPending(rows: HelpOffer[], now: number): HelpPoll {
  const [last, prev] = rows;
  if (!last || last.answer !== null || now - Date.parse(last.created_at) > OPEN_MS) return { offerId: null, repeat: false };
  const repeat = Boolean(prev && prev.answer === null && Date.parse(last.created_at) - Date.parse(prev.created_at) <= REPEAT_MS);
  return { offerId: last.id, repeat };
}

