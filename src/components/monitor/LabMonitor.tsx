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
import { useEffect, useState } from "react";

interface Props {
  slug: string;
  frames: Frame[];
  runError: Diagnostic | null;
  /** 조립판에서 누른 블록 — n은 같은 블록을 다시 눌러도 다시 실행되도록 늘어나는 번호 */
  play: { id: string; n: number } | null;
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
      <button type="button" className="tap btn-pill px-3" onClick={playing ? onPause : onResume}>{playing ? "⏸ 일시정지" : "▶ 이어 보기"}</button>
      <button type="button" className="tap btn-pill px-3" onClick={onReplay}>⟲ 처음부터</button>
      <span className="ml-auto font-bold text-muted" id="speed-label">재생 속도</span>
      {SPEEDS.map((s) => <button key={s} type="button" aria-describedby="speed-label" aria-pressed={speed === s} className="tap btn-pill px-2" onClick={() => onSpeed(s)}>{s}×</button>)}
    </div>
  );
}

function Log({ frames, index }: { frames: Frame[]; index: number }) {
  const shown = frames.slice(0, index + 1);
  const last = shown[shown.length - 1];
  return (
    <div className="mt-2">
      <p className="sr-only-live" aria-live="polite">{last?.event.note ?? ""}</p>
      <ol className="max-h-28 overflow-y-auto rounded-xl border-2 border-[#e0e6ef] bg-white p-2 text-sm" aria-label="실험 기록">
        {shown.map((f, i) => <li key={`${f.blockId}-${i}`} className={i === index ? "font-semibold" : "text-muted"}>{i + 1}. {f.event.note}</li>)}
      </ol>
    </div>
  );
}

/** 화면 위 상태 말풍선 (프로토타입의 status banner) — 같은 문장은 기록 목록과 aria-live로도 전달된다 */
function Status({ text }: { text: string }) {
  return <p aria-hidden="true" className="mt-2 flex min-h-[3.25rem] items-center justify-center rounded-2xl border-2 border-[#cfe0ff] bg-white px-4 py-1.5 text-center text-sm font-bold leading-snug text-nav shadow-sm">🔬 {text}</p>;
}

/** 블록 하나만 다시 실행하는 방법 안내 */
function PlayHint({ missed }: { missed: boolean }) {
  return (
    <p className="mt-1 text-xs font-semibold text-muted" aria-live="polite">
      {missed ? "🙈 그 블록은 이번 실험에서 실행되지 않았어요. 실행된 행동 블록을 눌러 보세요." : "👆 조립판의 행동 블록을 누르면 그 행동만 다시 실행해 보여 줘요."}
    </p>
  );
}

function Idle() {
  return (
    <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center pb-6 text-center font-bold text-[#3d5f9e]">
      <span aria-hidden="true" className="float-y text-4xl">🧪</span>
      <p className="mt-2">실험 블록을 조립하고<br />[▶ 실험 실행하기]를 눌러 보세요</p>
    </div>
  );
}

export default function LabMonitor({ slug, frames, runError, play, onActiveBlock, onFinish }: Props) {
  const player = useFramePlayer(frames, onFinish);
  const { playBlock } = player;
  const [missed, setMissed] = useState<number | null>(null);
  const activeId = player.frame?.blockId ?? null;

  useEffect(() => {
    onActiveBlock(activeId);
  }, [activeId, onActiveBlock]);

  // 실행한 뒤 블록을 누르면 그 블록의 행동만 다시 실행한다(실행 기록에 없는 블록이면 안내만)
  useEffect(() => {
    if (!play || frames.length === 0) return;
    const ok = playBlock(play.id);
    setMissed(ok ? null : play.n); // eslint-disable-line react-hooks/set-state-in-effect -- 누른 블록에 대한 일회성 안내
  }, [play, playBlock, frames.length]);

  return (
    <section aria-labelledby="monitor-title" className="flex flex-col">
      <h2 id="monitor-title" className="text-lg font-extrabold text-nav">💻 가상 실험 모니터</h2>
      {frames.length > 0 ? <div className="mt-2"><Controls playing={player.playing} speed={player.speed} onSpeed={player.setSpeed} onPause={player.pause} onResume={player.resume} onReplay={player.replay} /></div> : null}
      {frames.length > 0 ? <PlayHint missed={missed !== null && missed === play?.n} /> : null}
      {runError ? <p role="alert" className="mt-2 rounded-xl border-2 border-[#ff5252] bg-[#ffe9e9] p-2 text-sm font-semibold text-err">⛔ {runError.message}</p> : null}
      <Status text={frames.length > 0 ? player.frame?.event.note ?? "" : "대기 중 · 블록을 조립한 뒤 실행해 보세요"} />
      <div className={`monitor-screen mt-1 aspect-[8/5] w-full ${frames.length > 0 ? "has-scene" : ""} ${player.lead ? "lab-snap" : ""}`} style={{ ["--lab-speed" as string]: player.speed }}>
        {frames.length > 0 ? <div className="absolute inset-0"><Scene slug={slug} frame={player.frame} /></div> : <Idle />}
      </div>
      {frames.length > 0 ? <Log frames={frames} index={player.index} /> : null}
    </section>
  );
}
