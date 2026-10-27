/**
 * 학습 이벤트 종류 (D11 — 불변 events 로그가 교사 대시보드의 원천).
 * CLIENT_EVENTS: 학생 브라우저가 /api/events로 보낼 수 있는 화면 조작 3종.
 * SERVER_EVENTS: 서버 함수만 남기는 것 (제출·반환·AI 플래그 — 학생이 위조할 수 없다).
 */
export const CLIENT_EVENTS = ["block_edit", "playback_done", "graph_opened"] as const;

/** 실행·채점·예측 이벤트는 DB 트리거가 서버 기록(runs·measurements·predictions)에서 만든다 (0009) */
export const SERVER_EVENTS = [
  "session_started", "run_completed", "sim_error_flagged", "prediction_made", "prediction_explained", "calc_checked",
  "ai_reply", "ai_nudge", "ai_flagged", "report_submitted", "report_resubmitted", "report_returned",
] as const;

export type ClientEventType = (typeof CLIENT_EVENTS)[number];
export type EventType = ClientEventType | (typeof SERVER_EVENTS)[number];

export interface EventRow {
  session_id: string;
  student_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  ts: string;
}

/** 이벤트 → 학생이 지금 있는 탐구 단계 (교사 보드 표시용) */
export const STEP_OF_EVENT: Partial<Record<EventType, Step>> = {
  session_started: "design",
  block_edit: "design",
  sim_error_flagged: "design",
  prediction_made: "predict",
  playback_done: "run",
  run_completed: "data",
  calc_checked: "data",
  graph_opened: "graph",
  prediction_explained: "interpret",
  report_returned: "report",
  report_submitted: "submitted",
  report_resubmitted: "submitted",
};

export type Step = "design" | "predict" | "run" | "data" | "graph" | "interpret" | "report" | "submitted";

export const STEP_LABEL: Record<Step, string> = {
  design: "설계", predict: "예측", run: "실행", data: "데이터·계산", graph: "그래프", interpret: "해석", report: "보고서", submitted: "제출함",
};
