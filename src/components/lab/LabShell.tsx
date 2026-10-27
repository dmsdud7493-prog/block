"use client";
/**
 * 학생 실험 화면 S-02~S-05 — 탐구 흐름 전체를 한 화면에 (지침 1.4).
 * 왼쪽: 블록 설계 / 가운데: 점검·모니터 / 오른쪽: AI 튜터 / 아래: 결과 표·그래프·차이 설명
 */
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { getCatalog } from "@/lib/engine/experiments";
import type { Diagnostic } from "@/lib/engine/types";
import StepStepper from "@/components/inquiry/StepStepper";
import InquiryCards from "@/components/inquiry/InquiryCards";
import CheckPanel from "@/components/inquiry/CheckPanel";
import LabMonitor from "@/components/monitor/LabMonitor";
import PredictionGate from "@/components/data/PredictionGate";
import type { LabBackend } from "./backend";
import { useLabController, type LabController } from "./useLabController";
import { afterExplained, latestRun } from "./state";
import type { LabState, Phase } from "./types";
import ResultsSection from "./ResultsSection";
import { DEFAULT_SETTINGS, editorDiagnostics, type LabSettings } from "./editorDiagnostics";

const BlocklyWorkspace = dynamic(() => import("@/components/blocks/BlocklyWorkspace"), {
  ssr: false,
  loading: () => <p className="p-6 text-muted">블록 작업 공간을 불러오는 중…</p>,
});

interface Props {
  slug: string;
  backend: LabBackend;
  hydrate?: Partial<LabState>;
  initialBlockly?: object | null;
  tutor?: (ctl: LabController) => React.ReactNode;
  report?: (ctl: LabController, back: () => void) => React.ReactNode;
  badge?: string;
  /** 교사 설정 (지침 2.4·4.4): 편집 중 점검 안내 수준, 실행 전 변인 이유 요구 */
  settings?: LabSettings;
}


function stepperState(s: LabState): { done: Partial<Record<Phase, boolean>>; locked: Partial<Record<Phase, string>> } {
  const run = latestRun(s);
  return {
    done: { design: s.runs.length > 0, predict: s.predictions.length > 0, run: Boolean(run?.ok), interpret: afterExplained(s) },
    locked: afterExplained(s) ? {} : { report: "결과를 보고 예상과 비교한 다음 열려요" },
  };
}

function ExampleSteps({ steps }: { steps: string[] }) {
  return (
    <details className="rounded border border-line bg-panel p-2 text-sm">
      <summary className="cursor-pointer font-semibold">💡 예시 순서 (처음 3단계만)</summary>
      <ol className="mt-1 list-inside list-decimal">{steps.map((t) => <li key={t}>{t}</li>)}</ol>
      <p className="mt-1 text-muted">… 나머지는 직접 이어서 완성해 보세요!</p>
    </details>
  );
}

function RunButton({ running, onRun, errors }: { running: boolean; onRun: () => void; errors: number }) {
  return (
    <button type="button" onClick={onRun} disabled={running} className="tap w-full rounded-lg bg-brand px-4 py-2 text-lg font-bold text-white disabled:opacity-60" aria-describedby="run-help">
      {running ? "실험 중…" : "▶ 실험 실행하기"}
      <span id="run-help" className="sr-only">{errors > 0 ? `고칠 곳 ${errors}개가 있어요. 실행하면 그 블록에서 멈춰요.` : ""}</span>
    </button>
  );
}

function DesignPane({ slug, examples, initial, diagnostics, activeBlock, errorBlock, focusBlock, onProgram, onFocus }: {
  slug: string; examples: string[]; initial: object | null; diagnostics: Diagnostic[]; activeBlock: string | null; errorBlock: string | null; focusBlock: string | null;
  onProgram: LabController["onProgram"]; onFocus: (id: string) => void;
}) {
  return (
    <section aria-label="블록 실험 설계" className="flex min-h-[560px] flex-col gap-2 rounded-lg border border-line bg-panel p-2">
      <ExampleSteps steps={examples} />
      <p className="text-xs text-muted" id="kbd-help">⌨️ 키보드: 작업 공간 선택 후 <kbd>T</kbd> 도구 상자 · 화살표 이동 · <kbd>Enter</kbd> 블록 놓기/선택 · <kbd>M</kbd> 블록 옮기기 · <kbd>Delete</kbd> 지우기</p>
      <div className="min-h-[480px] flex-1">
        <BlocklyWorkspace slug={slug} initialState={initial} diagnostics={diagnostics} activeBlockId={activeBlock} errorBlockId={errorBlock} selectBlockId={focusBlock} onProgramChange={onProgram} onBlockClick={onFocus} />
      </div>
    </section>
  );
}

function MonitorPane({ slug, ctl, settings, runError, focusBlock, onFocus, onActive, onFinish }: {
  slug: string; ctl: LabController; settings: LabSettings; runError: Diagnostic | null; focusBlock: string | null; onFocus: (id: string) => void; onActive: (id: string | null) => void; onFinish: () => void;
}) {
  const { state } = ctl;
  const run = latestRun(state);
  const shown = editorDiagnostics(state.diagnostics, settings.hintLevelEditing);
  const errors = shown.filter((d) => d.severity === "error").length;
  const missingWhy = settings.rationaleGate && state.program.variables.some((v) => !(v.rationale ?? "").trim());
  const onRun = () => (missingWhy ? ctl.dispatch({ type: "runFail", message: "실행 전에 변인 블록마다 '이유' 칸을 채워 주세요. 왜 그렇게 정했는지 적어 봐요." }) : void ctl.run());
  return (
    <section aria-label="점검과 실험 모니터" className="flex flex-col gap-2">
      <RunButton running={state.running} onRun={onRun} errors={errors} />
      {state.runError ? <p role="alert" className="text-sm text-err">{state.runError}</p> : null}
      {settings.hintLevelEditing === "none" ? <p className="text-sm text-muted">이번 실험은 실행할 때만 점검 결과를 보여 줘요.</p> : <CheckPanel diagnostics={shown} onFocusBlock={onFocus} />}
      <LabMonitor key={run?.runNo ?? 0} slug={slug} frames={run?.frames ?? []} runError={runError} focusBlockId={focusBlock} onActiveBlock={onActive} onFinish={onFinish} />
    </section>
  );
}

export default function LabShell({ slug, backend, hydrate, initialBlockly, tutor, report, badge, settings }: Props) {
  const catalog = getCatalog(slug);
  if (!catalog) return <p role="alert">알 수 없는 실험이에요.</p>;
  return <LabShellInner slug={slug} backend={backend} hydrate={hydrate} initialBlockly={initialBlockly} tutor={tutor} report={report} badge={badge} settings={settings ?? DEFAULT_SETTINGS} />;
}

function LabShellInner({ slug, backend, hydrate, initialBlockly, tutor, report, badge, settings = DEFAULT_SETTINGS }: Props) {
  const catalog = getCatalog(slug)!;
  const ctl = useLabController(catalog, backend, hydrate);
  const { state, dispatch } = ctl;
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [focusBlock, setFocusBlock] = useState<string | null>(null);
  const [initial] = useState<object | null>(initialBlockly ?? null);
  const run = latestRun(state);
  const runError: Diagnostic | null = run && !run.ok ? run.diagnostics.find((d) => d.severity === "error") ?? null : null;
  const gate = catalog.predictionTargets.find((t) => t.id === state.gateTarget);
  const st = stepperState(state);
  const onActive = useCallback((id: string | null) => setActiveBlock(id), []);
  const onFinish = useCallback(() => backend.logEvent("playback_done", {}), [backend]);
  /** 실행 버튼에서 열린 예측 게이트는 저장 뒤 바로 실행, 그래프에서 열린 게이트는 바로 그래프를 연다 */
  const submitGate = async (target: string, choice: string, rationale: string, sketch?: (number | null)[]) => {
    const before = state.runs.length;
    try {
      const rec = await ctl.predict(target, choice, rationale, sketch);
      if (before === 0) await ctl.run(rec);
      else ctl.openGraph(rec);
    } catch {
      // 저장 실패 시 게이트가 닫히지 않으므로 학생이 다시 시도할 수 있다
    }
  };

  if (state.phase === "report" && report) {
    return <main id="main" className="mx-auto max-w-6xl p-3">{report(ctl, () => dispatch({ type: "phase", phase: "interpret" }))}</main>;
  }

  return (
    <main id="main" className="mx-auto max-w-[1600px] space-y-3 p-3">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-xl font-bold">🔬 {catalog.title} 가상 실험실 {badge ? <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-sm text-amber-900">{badge}</span> : null}</h1>
        <div className="lg:w-[640px]"><StepStepper phase={state.phase} done={st.done} locked={st.locked} onSelect={(p) => dispatch({ type: "phase", phase: p })} /></div>
      </header>
      <p className="text-sm text-muted">🎯 {catalog.goal}</p>
      <InquiryCards catalog={catalog} program={state.program} inquiry={state.inquiry} predictions={state.predictions} onInquiry={(field, value) => dispatch({ type: "inquiry", field, value })} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)]">
        <DesignPane slug={slug} examples={catalog.exampleSteps} initial={initial} diagnostics={editorDiagnostics(state.diagnostics, settings.hintLevelEditing)} activeBlock={activeBlock} errorBlock={runError?.blockId ?? null} focusBlock={focusBlock} onProgram={ctl.onProgram} onFocus={setFocusBlock} />
        <MonitorPane slug={slug} ctl={ctl} settings={settings} runError={runError} focusBlock={focusBlock} onFocus={setFocusBlock} onActive={onActive} onFinish={onFinish} />
        <aside aria-label="AI 튜터" className="min-h-[300px]">{tutor ? tutor(ctl) : null}</aside>
      </div>

      <ResultsSection catalog={catalog} ctl={ctl} />
      {gate ? <PredictionGate target={gate} record={state.predictions.find((p) => p.target === gate.id)} purpose={state.runs.length ? "그래프를 보기 전에" : "실험하기 전에"} onHint={() => dispatch({ type: "hint", target: gate.id })} onSubmit={(c, r, sk) => void submitGate(gate.id, c, r, sk)} onCancel={() => dispatch({ type: "closeGate" })} /> : null}
    </main>
  );
}
