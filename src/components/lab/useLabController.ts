"use client";
/**
 * 실험실 컨트롤러 — 상태 리듀서 + 백엔드 호출 + 교육적 게이트.
 * - 실행 전 첫 예측 필수(지침 3.1), 그래프 공개 전 나머지 예측 필수
 * - 실행마다 runs 누적·바뀐 변인 기록(지침 3.4·3.3)
 * - 블록 변경 즉시 dryRun(지침 1.3·2.3)
 * - 실행·채점·예측 이벤트는 서버 기록에서 DB 트리거가 남긴다(위조 방지, 0009) — 여기서는 화면 조작만 로그
 */
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { CalcRequest, Program } from "@/lib/engine/types";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import { dryRun } from "@/lib/engine/simulator/run";
import { changedVariables } from "@/lib/engine/rules/variables";
import { graphTargets, runTarget } from "@/lib/engine/predictionScope";
import type { LabBackend } from "./backend";
import { initialLabState, labReducer, latestRun, missingPrediction } from "./state";
import type { LabState, PredictionRecord, RunRecord } from "./types";

export function useLabController(catalog: AnyCatalog, backend: LabBackend, hydrate?: Partial<LabState>) {
  const [state, dispatch] = useReducer(labReducer, initialLabState(catalog.slug, hydrate));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onProgram = useCallback((program: Program, blockly: object) => {
    dispatch({ type: "program", program, blockly, diagnostics: dryRun(program, catalog) });
    backend.logEvent("block_edit", { steps: program.steps.length, variables: program.variables.length });
  }, [backend, catalog]);

  // 블록·탐구 카드가 바뀌면 1.5초 뒤 자동저장 (첫 렌더는 건너뜀 — 불러온 상태를 다시 저장하지 않기 위해)
  const firstSave = useRef(true);
  const { program, blockly, inquiry, programVersion } = state;
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return undefined;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void backend.saveProgram(program, blockly, inquiry), 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [backend, program, blockly, inquiry, programVersion]);

  const run = useCallback(async (justSaved?: PredictionRecord) => {
    // 블록에 쓰인 물질에 맞는 예측을 묻는다(물·식용유만 다루면 철조각 예측은 묻지 않음)
    const first = runTarget(catalog, state.program);
    const predictions = justSaved ? [...state.predictions.filter((p) => p.target !== justSaved.target), justSaved] : state.predictions;
    if (first && missingPrediction({ ...state, predictions }, [first])) {
      dispatch({ type: "openGate", target: first });
      return;
    }
    dispatch({ type: "runStart" });
    const runNo = state.runs.length + 1;
    let res: Awaited<ReturnType<LabBackend["run"]>>;
    try {
      res = await backend.run(state.program, runNo, predictions);
    } catch {
      dispatch({ type: "runFail", message: "연결이 잠시 끊겼어요. 다시 실행해 볼까요?" });
      return;
    }
    if (res.error || !res.data) {
      if (res.error?.code === "prediction_required" && first) dispatch({ type: "openGate", target: first });
      dispatch({ type: "runFail", message: res.error?.message ?? "실행하지 못했어요." });
      return;
    }
    const prev = latestRun(state)?.program ?? null;
    const changed = changedVariables(prev, state.program, catalog.variableOptions, catalog.isTrialEnd);
    const record: RunRecord = { ...res.data, runNo, program: state.program, changedVars: changed };
    dispatch({ type: "runDone", run: record });
  }, [backend, catalog, state]);

  const predict = useCallback(async (target: string, choice: string, rationale: string, sketch?: (number | null)[]) => {
    const prev = state.predictions.find((p) => p.target === target);
    const record: PredictionRecord = { target, choice, rationale, hintsUsed: prev?.hintsUsed ?? 0, ...(sketch ? { sketch } : {}) };
    dispatch({ type: "predicted", record });
    await backend.savePrediction(record, latestRun(state)?.runNo ?? null);
    return record;
  }, [backend, state]);

  const check = useCallback(async (req: CalcRequest, runNo: number, value: number, unit: string) => {
    const prev = state.calc[req.key];
    const res = await backend.check(latestRun(state)?.program ?? state.program, runNo, req.key, value, unit);
    const attempts = (prev?.attempts ?? 0) + 1;
    const data = res.data;
    const entry = { key: req.key, runNo, value: String(value), unit, attempts, correct: data?.correct ?? false, errorType: data?.errorType ?? null, hint: data?.hint ?? res.error?.message ?? null };
    dispatch({ type: "calc", entry });
  }, [backend, state]);

  const openGraph = useCallback((justSaved?: PredictionRecord) => {
    const predictions = justSaved ? [...state.predictions.filter((p) => p.target !== justSaved.target), justSaved] : state.predictions;
    const missing = missingPrediction({ ...state, predictions }, graphTargets(catalog, latestRun(state)?.program ?? state.program));
    if (missing) {
      dispatch({ type: "openGate", target: missing });
      return;
    }
    dispatch({ type: "graph" });
    backend.logEvent("graph_opened", { guideline: "3.1" });
  }, [backend, catalog, state]);

  const explainAfter = useCallback((target: string, matched: boolean, text: string) => {
    dispatch({ type: "after", target, matched, text });
    void backend.savePrediction({ ...(state.predictions.find((p) => p.target === target) as PredictionRecord), matched, rationaleAfter: text }, latestRun(state)?.runNo ?? null);
  }, [backend, state]);

  return { state, dispatch, onProgram, run, predict, check, openGraph, explainAfter };
}

export type LabController = ReturnType<typeof useLabController>;
