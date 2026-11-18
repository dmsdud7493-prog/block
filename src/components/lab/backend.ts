/**
 * 실험실 백엔드 어댑터 — 같은 UI가 데모(저장 없음)와 실제 세션(저장·교사 제출)을 모두 쓴다.
 */
import type { Program } from "@/lib/engine/types";
import type { ErrorType } from "@/lib/engine/grader/errorTypes";
import type { Frame, Measurement, CalcRequest, Series, Diagnostic } from "@/lib/engine/types";
import type { InquiryText, PredictionRecord } from "./types";
import { postJson, type ApiResult } from "./api";
import type { ClientEventType } from "@/lib/events/types";

export interface RunPayload {
  runNo: number;
  ok: boolean;
  frames: Frame[];
  measurements: Measurement[];
  calcRequests: CalcRequest[];
  series: Series[];
  diagnostics: Diagnostic[];
  stoppedAt: number | null;
}

export interface CheckPayload {
  correct: boolean;
  errorType: ErrorType | null;
  hint: string | null;
}

export interface LabBackend {
  mode: "demo" | "session";
  run(program: Program, runNo: number, predictions: PredictionRecord[]): Promise<ApiResult<RunPayload>>;
  check(program: Program, runNo: number, key: string, value: number, unit: string): Promise<ApiResult<CheckPayload>>;
  savePrediction(p: PredictionRecord, runNo: number | null): Promise<ApiResult<unknown>>;
  saveProgram(program: Program, blockly: object | null, inquiry: InquiryText): Promise<void>;
  logEvent(type: ClientEventType, payload: Record<string, unknown>): void;
}

export function demoBackend(slug: string, seed: string): LabBackend {
  return {
    mode: "demo",
    run: (program, runNo, predictions) =>
      postJson<RunPayload>("/api/demo/run", { slug, seed, runNo, program, predictions: predictions.map((p) => ({ target: p.target, choice: p.choice, rationale: p.rationale })) }),
    check: (program, runNo, key, value, unit) =>
      postJson<CheckPayload>("/api/demo/check", { slug, seed, runNo, program, key, value, unit }),
    savePrediction: () => Promise.resolve({ data: { saved: false }, error: null }),
    saveProgram: () => Promise.resolve(),
    logEvent: () => undefined,
  };
}

/** 블록 편집 기록은 15초에 1건만 남긴다 — 교사 보드는 '최근 활동 시각'만 쓰는데, 블록을 옮길 때마다 남기면
 *  28명 한 차시에 수천 건이 쌓여 보드가 느려지고 DB가 빨리 찬다(2026-11-18 수업 전 점검) */
const EDIT_EVERY_MS = 15_000;

export function sessionBackend(sessionId: string): LabBackend {
  let queue: { type: string; payload: Record<string, unknown> }[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastEdit = 0;
  const flush = () => {
    const batch = queue;
    queue = [];
    if (batch.length) void postJson("/api/events", { sessionId, events: batch });
  };
  return {
    mode: "session",
    run: (program, runNo, predictions) =>
      postJson<RunPayload>("/api/run", { sessionId, program, runNo, predictionTargets: predictions.map((p) => p.target) }),
    check: (_program, runNo, key, value, unit) => postJson<CheckPayload>("/api/check", { sessionId, runNo, key, value, unit }),
    savePrediction: (p, runNo) => postJson("/api/predict", { sessionId, runNo, ...p }),
    saveProgram: async (program, blockly, inquiry) => {
      try {
        await postJson("/api/session/program", { sessionId, program, blockly, inquiry }, "PUT");
      } catch {
        // 자동저장 실패는 다음 변경 때 다시 시도한다
      }
    },
    logEvent: (type, payload) => {
      if (type === "block_edit" && Date.now() - lastEdit < EDIT_EVERY_MS) return;
      if (type === "block_edit") lastEdit = Date.now();
      queue = [...queue, { type, payload }];
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 1500);
    },
  };
}
