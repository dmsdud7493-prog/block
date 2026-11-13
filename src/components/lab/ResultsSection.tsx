"use client";
/** 결과 영역 — 데이터 표 → (예측 확인 후) 그래프 → 예상과 비교 → 보고서로. 밀도처럼 resultView가 "layers"면 그래프·비교 대신 한 비커 그림 */
import dynamic from "next/dynamic";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import DataTable from "@/components/data/DataTable";
import AfterExplain from "@/components/data/AfterExplain";
import LayerResult from "@/components/data/LayerResult";
import ReferencePanel from "@/components/data/ReferencePanel";
import type { LabController } from "./useLabController";
import { latestRun, missingPrediction, reportReady } from "./state";
import { allMissionsDone, missionProgress } from "./missions";

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

/** 다음 미션으로 — 블록 위 '오늘의 미션' 칸으로 옮겨 간다 */
function NextMission({ n, numbered, onStart }: { n: number; numbered: boolean; onStart: () => void }) {
  const go = () => {
    onStart();
    const bar = document.getElementById("today-mission");
    bar?.scrollIntoView({ behavior: "smooth", block: "center" });
    bar?.focus({ preventScroll: true });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="tap btn-sun px-5 py-2" onClick={go}>🎯 미션{numbered ? ` ${n}` : ""} 하러 가기</button>
      <span className="text-sm text-muted">누르면 조립판이 비워져요. 새로 블록을 짜서 다음 미션을 실행해 봐요. 지난 미션 기록은 보고서에 그대로 남아요.</span>
    </div>
  );
}

function ToReport({ ctl, catalog, onNextMission }: { ctl: LabController; catalog: AnyCatalog; onNextMission: () => void }) {
  const p = missionProgress(catalog, ctl.state);
  if (p.missions.length > 0 && !allMissionsDone(p)) {
    return p.current > 0 ? <NextMission n={p.current + 1} numbered={p.missions.length > 1} onStart={onNextMission} /> : <p className="text-sm text-muted">🎯 오늘의 미션을 마치면 다음 단계가 열려요.</p>;
  }
  const ready = reportReady(ctl.state, catalog);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="tap rounded-full bg-ok px-5 py-2 font-bold text-white shadow-[0_3px_0_#05613f] disabled:opacity-50" disabled={!ready} onClick={() => ctl.dispatch({ type: "phase", phase: "report" })}>📝 실험 보고서 쓰러 가기</button>
      {!ready ? <span className="text-sm text-muted">{catalog.resultView?.kind === "layers" ? "표의 계산값을 모두 맞게 확인하면 열려요." : "예상과 결과를 비교해 적으면 열려요."}</span> : null}
    </div>
  );
}

/** 밀도: 그래프·예상 비교 없이 계산값 확인 → 한 비커 그림 → 보고서로 */
function LayersView({ catalog, ctl, liquids, onNext }: { catalog: AnyCatalog; ctl: LabController; liquids: string[]; onNext: () => void }) {
  const { state } = ctl;
  const okRun = [...state.runs].reverse().find((r) => r.ok);
  return (
    <>
      {okRun ? <LayerResult catalog={catalog} run={okRun} calc={state.calc} liquids={liquids} /> : null}
      {okRun ? <ToReport ctl={ctl} catalog={catalog} onNextMission={onNext} /> : null}
    </>
  );
}

/**
 * 그래프형: 예측 확인 후 그래프 → 예상과 비교 → 보고서로.
 * 미션이 남아 있으면 그래프는 아직 — 다음 미션 버튼만 보이고, 마지막 미션까지 마치면 그래프가 열린다
 * (사용자 요청 2026-11-13: "미션 3을 해야 그래프 그리기가 나오도록, 미션 1이 끝나면 미션 2 하기 버튼").
 * 녹는점·끓는점·증류(graphForMissions)는 그래프에서 값을 읽어야 미션을 마치므로 미션마다 그래프를 연다.
 */
function GraphView({ catalog, ctl, onNext }: { catalog: AnyCatalog; ctl: LabController; onNext: () => void }) {
  const { state } = ctl;
  const okRun = [...state.runs].reverse().find((r) => r.ok);
  const p = missionProgress(catalog, state);
  if (p.missions.length > 0 && !allMissionsDone(p) && !catalog.graphForMissions) return okRun ? <ToReport ctl={ctl} catalog={catalog} onNextMission={onNext} /> : null;
  return (
    <>
      {okRun && !state.graphOpened ? <GraphGate ctl={ctl} catalog={catalog} /> : null}
      {state.graphOpened ? <ResultChart catalog={catalog} runs={state.runs} predictions={state.predictions} /> : null}
      {state.graphOpened ? <AfterExplain targets={catalog.predictionTargets} predictions={state.predictions} onSave={ctl.explainAfter} /> : null}
      {state.graphOpened ? <ToReport ctl={ctl} catalog={catalog} onNextMission={onNext} /> : null}
    </>
  );
}

export default function ResultsSection({ catalog, ctl, onNextMission }: { catalog: AnyCatalog; ctl: LabController; onNextMission: () => void }) {
  const { state } = ctl;
  const run = latestRun(state);
  if (!run) return null;
  const okRun = [...state.runs].reverse().find((r) => r.ok);
  return (
    <section aria-label="실험 결과" className="space-y-3">
      {catalog.reference?.map((t) => <ReferencePanel key={t.title} table={t} />)}
      {okRun ? <DataTable catalog={catalog} run={okRun} calc={state.calc} onCheck={(req, v, u) => ctl.check(req, okRun.runNo, v, u)} /> : null}
      {catalog.resultView?.kind === "layers"
        ? <LayersView catalog={catalog} ctl={ctl} liquids={catalog.resultView.liquids} onNext={onNextMission} />
        : <GraphView catalog={catalog} ctl={ctl} onNext={onNextMission} />}
    </section>
  );
}
