"use client";
/**
 * 가상 실험 모니터 (요구사항 6) — 실행 프레임을 재생하고, 오류가 난 블록과 이유를 함께 보여 준다.
 * 자동으로 바뀌는 화면이라 일시정지 버튼과 텍스트 기록(aria-live)을 제공한다 (KWCAG).
 */
import type { Diagnostic, Frame, SimEvent } from "@/lib/engine/types";
import { useFramePlayer } from "./useFramePlayer";
import DensityScene from "./scenes/DensityScene";
import GenericScene from "./scenes/GenericScene";
import MeltingScene from "./scenes/MeltingScene";
import BoilingScene from "./scenes/BoilingScene";
import SolubilityScene from "./scenes/SolubilityScene";
import Separation1Scene from "./scenes/Separation1Scene";
import Separation2Scene from "./scenes/Separation2Scene";
import { useEffect } from "react";

interface Props {
  slug: string;
  frames: Frame[];
  runError: Diagnostic | null;
  focusBlockId: string | null;
  onActiveBlock: (blockId: string | null) => void;
  onFinish: () => void;
}

type SceneProps = { state: never; event: SimEvent | null };
const SCENES: Record<string, (p: SceneProps) => React.ReactNode> = {
  density: DensityScene as (p: SceneProps) => React.ReactNode,
  melting: MeltingScene as (p: SceneProps) => React.ReactNode,
  boiling: BoilingScene as (p: SceneProps) => React.ReactNode,
  solubility: SolubilityScene as (p: SceneProps) => React.ReactNode,
  separation1: Separation1Scene as (p: SceneProps) => React.ReactNode,
  separation2: Separation2Scene as (p: SceneProps) => React.ReactNode,
};

function Scene({ slug, frame }: { slug: string; frame: Frame | null }) {
  const event: SimEvent | null = frame?.event ?? null;
  const Specific = SCENES[slug];
  if (!Specific) return <GenericScene state={frame?.state ?? null} event={event} />;
  return <Specific state={(frame?.state ?? null) as never} event={event} />;
}

const SPEEDS = [0.5, 1, 2];

function Controls({ playing, speed, onSpeed, onPause, onResume, onReplay }: {
  playing: boolean; speed: number; onSpeed: (n: number) => void; onPause: () => void; onResume: () => void; onReplay: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button type="button" className="tap rounded border border-line px-2" onClick={playing ? onPause : onResume}>{playing ? "⏸ 일시정지" : "▶ 이어 보기"}</button>
      <button type="button" className="tap rounded border border-line px-2" onClick={onReplay}>⟲ 처음부터</button>
      <span className="text-muted" id="speed-label">재생 속도</span>
      {SPEEDS.map((s) => <button key={s} type="button" aria-describedby="speed-label" aria-pressed={speed === s} className={`tap rounded px-2 ${speed === s ? "bg-brand text-white" : "border border-line"}`} onClick={() => onSpeed(s)}>{s}×</button>)}
    </div>
  );
}

function Log({ frames, index }: { frames: Frame[]; index: number }) {
  const shown = frames.slice(0, index + 1);
  const last = shown[shown.length - 1];
  return (
    <div className="mt-2">
      <p className="sr-only-live" aria-live="polite">{last?.event.note ?? ""}</p>
      <ol className="max-h-28 overflow-y-auto rounded border border-line bg-white p-2 text-sm" aria-label="실험 기록">
        {shown.map((f, i) => <li key={`${f.blockId}-${i}`} className={i === index ? "font-semibold" : "text-muted"}>{i + 1}. {f.event.note}</li>)}
      </ol>
    </div>
  );
}

export default function LabMonitor({ slug, frames, runError, focusBlockId, onActiveBlock, onFinish }: Props) {
  const player = useFramePlayer(frames, onFinish);
  const { showBlock } = player;
  const activeId = player.frame?.blockId ?? null;

  useEffect(() => {
    onActiveBlock(activeId);
  }, [activeId, onActiveBlock]);

  useEffect(() => {
    if (focusBlockId) showBlock(focusBlockId);
  }, [focusBlockId, showBlock]);

  return (
    <section aria-labelledby="monitor-title" className="flex h-full flex-col rounded-lg border border-line bg-panel p-2">
      <h2 id="monitor-title" className="font-bold">💻 가상 실험 모니터</h2>
      <div className="mt-1">
        {frames.length > 0 ? <Controls playing={player.playing} speed={player.speed} onSpeed={player.setSpeed} onPause={player.pause} onResume={player.resume} onReplay={player.replay} /> : null}
      </div>
      {runError ? <p role="alert" className="mt-2 rounded border-2 border-err bg-red-50 p-2 text-sm text-err">⛔ {runError.message}</p> : null}
      <div className="mt-2 min-h-[240px] flex-1 rounded bg-slate-50">
        {frames.length > 0 ? <Scene slug={slug} frame={player.frame} /> : <p className="p-6 text-center text-muted">블록을 조립하고 [▶ 실험 실행하기]를 눌러 보세요.</p>}
      </div>
      {frames.length > 0 ? <Log frames={frames} index={player.index} /> : null}
    </section>
  );
}
