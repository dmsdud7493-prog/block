"use client";
/** 결과 영역 — 데이터 표 → (예측 확인 후) 그래프 → 예상과 비교 → 보고서로 */
import dynamic from "next/dynamic";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import DataTable from "@/components/data/DataTable";
import AfterExplain from "@/components/data/AfterExplain";
import ReferencePanel from "@/components/data/ReferencePanel";
import RunHistory from "./RunHistory";
import type { LabController } from "./useLabController";
import { afterExplained, latestRun, missingPrediction } from "./state";

const ResultChart = dynamic(() => import("@/components/data/ResultChart"), { ssr: false, loading: () => <p className="text-muted">그래프를 그리는 중…</p> });

function GraphGate({ ctl, catalog }: { ctl: LabController; catalog: AnyCatalog }) {
  const missing = missingPrediction(ctl.state, catalog.predictionTargets.map((t) => t.id));
  return (
    <div className="rounded-xl border-2 border-dashed border-[#4c97ff] bg-[#f4f8ff] p-3 text-sm font-semibold">
      <p>{missing ? "그래프를 보기 전에 결과를 먼저 예상해요." : "예상을 모두 적었어요. 이제 그래프로 확인해 볼까요?"}</p>
      <button type="button" className="tap btn-sun mt-2 px-5" onClick={() => ctl.openGraph()}>📈 그래프 그리기</button>
    </div>
  );
}

function ToReport({ ctl }: { ctl: LabController }) {
  const ready = afterExplained(ctl.state);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="tap rounded-full bg-ok px-5 py-2 font-bold text-white shadow-[0_3px_0_#05613f] disabled:opacity-50" disabled={!ready} onClick={() => ctl.dispatch({ type: "phase", phase: "report" })}>📝 실험 보고서 쓰러 가기</button>
      {!ready ? <span className="text-sm text-muted">예상과 결과를 비교해 적으면 열려요.</span> : null}
    </div>
  );
}

export default function ResultsSection({ catalog, ctl }: { catalog: AnyCatalog; ctl: LabController }) {
  const { state } = ctl;
  const run = latestRun(state);
  if (!run) return null;
  const okRun = [...state.runs].reverse().find((r) => r.ok);
  return (
    <section aria-label="실험 결과" className="space-y-3">
      {catalog.reference?.map((t) => <ReferencePanel key={t.title} table={t} />)}
      {okRun ? <DataTable catalog={catalog} run={okRun} calc={state.calc} onCheck={(req, v, u) => ctl.check(req, okRun.runNo, v, u)} /> : null}
      {okRun && !state.graphOpened ? <GraphGate ctl={ctl} catalog={catalog} /> : null}
      {state.graphOpened ? <ResultChart catalog={catalog} runs={state.runs} predictions={state.predictions} /> : null}
      {state.graphOpened ? <AfterExplain targets={catalog.predictionTargets} predictions={state.predictions} onSave={ctl.explainAfter} /> : null}
      <RunHistory runs={state.runs} />
      {state.graphOpened ? <ToReport ctl={ctl} /> : null}
    </section>
  );
}
