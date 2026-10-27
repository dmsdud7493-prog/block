/**
 * 힌트 사다리 (지침 4.1~4.4, research §5): L0 점검 질문 → L1 개념 → L2 부분 예시 → L3 다음 한 단계.
 * 서버가 허용 최대 레벨을 계산해 <상태>에 넣고, 모델 응답이 이를 넘으면 거부·재요청한다.
 */
export interface LadderInput {
  /** 같은 칸·블록에서 연속 실패 횟수 (채점 attempts, 점검 오류 반복) */
  failCount: number;
  /** 마지막 조작 이후 정체 시간(초) */
  idleSeconds: number;
  /** 직전 튜터 응답의 힌트 레벨 (없으면 -1) */
  lastHintLevel: number;
  /** 이번 학생 메시지에 자기 생각(시도)이 담겼는가 */
  studentAttempted: boolean;
  /** 페이딩 프로파일 0~3: 같은 유형을 스스로 해결한 횟수가 쌓이면 올라간다 (지침 4.4) */
  scaffoldLevel: number;
}

const clamp = (n: number) => Math.max(0, Math.min(3, n));

export function hintLevelMax(i: LadderInput): number {
  const first = i.lastHintLevel < 0;
  // 시도 없이 다시 묻는다면 사다리를 올리지 않는다 (지침 4.2)
  const climbed = first ? 0 : i.studentAttempted ? i.lastHintLevel + 1 : i.lastHintLevel;
  // 반복 실패·정체면 자동으로 예시 단계까지 (지침 4.3). 스스로 잘 해 온 학생은 한 번 더 기다린다 (지침 4.4)
  const failThreshold = i.scaffoldLevel >= 2 ? 3 : 2;
  const stuck = i.failCount >= failThreshold || i.idleSeconds >= 180;
  return clamp(stuck ? Math.max(climbed, 2) : climbed);
}

const NOT_ATTEMPT = /^(몰라|모르겠|알려\s*줘|답\s*(좀|알려|뭐)|정답|그냥|ㅇㅇ|ㄴㄴ|네|응|아니)/;

/** 학생 메시지가 '시도'인지: 8자 이상이고 단순 요청이 아님 */
export function isAttempt(text: string): boolean {
  const t = text.trim();
  if (t.startsWith("(시스템 알림")) return false;
  return t.length >= 8 && !NOT_ATTEMPT.test(t) || /\d/.test(t) && t.length >= 3;
}

/** 다음 세션 scaffold_level: 같은 유형을 힌트 없이(또는 L0만으로) 해결했으면 +1, L2 이상이 필요했으면 -1 */
export function nextScaffoldLevel(current: number, maxHintUsed: number, solved: boolean): number {
  if (!solved) return clamp(current);
  if (maxHintUsed <= 0) return clamp(current + 1);
  if (maxHintUsed >= 2) return clamp(current - 1);
  return clamp(current);
}
