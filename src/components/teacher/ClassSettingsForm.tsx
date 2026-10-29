"use client";
/** 교사 설정 (지침 2.4·4.4·5.4): 편집 중 힌트 수준, 튜터 말투, 실행 횟수 제한, 변인 근거 입력 요구 */
import { useState } from "react";
import { useAction } from "./useAction";

interface Settings { hint_level_editing: "none" | "slots" | "all"; tone: "haeyo" | "banmal"; max_runs: number | null; rationale_gate: boolean }

function Radio<T extends string>({ name, value, current, label, onPick }: { name: string; value: T; current: T; label: string; onPick: (v: T) => void }) {
  return <label className="tap flex items-center gap-2 text-sm"><input type="radio" name={name} checked={current === value} onChange={() => onPick(value)} />{label}</label>;
}

export default function ClassSettingsForm({ classId, settings }: { classId: string; settings: Record<string, unknown> }) {
  const [s, setS] = useState<Settings>({ hint_level_editing: "slots", tone: "haeyo", max_runs: null, rationale_gate: false, ...(settings as Partial<Settings>) });
  const act = useAction("/api/class/settings");
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => ({ ...prev, [k]: v }));
  return (
    <section aria-labelledby="set-title" className="rounded-lg border border-line bg-panel p-3">
      <h2 id="set-title" className="text-lg font-bold">⚙️ 수업 설정</h2>
      <fieldset className="mt-2"><legend className="text-sm font-semibold">블록 편집 중 점검 안내</legend>
        <Radio name="hle" value="all" current={s.hint_level_editing} label="모두 보여 주기 (순서 오류까지)" onPick={(v) => set("hint_level_editing", v)} />
        <Radio name="hle" value="slots" current={s.hint_level_editing} label="빈 칸·단위만 (권장)" onPick={(v) => set("hint_level_editing", v)} />
        <Radio name="hle" value="none" current={s.hint_level_editing} label="실행할 때만 확인 (평가용)" onPick={(v) => set("hint_level_editing", v)} />
      </fieldset>
      <fieldset className="mt-2"><legend className="text-sm font-semibold">AI 튜터 말투</legend>
        <Radio name="tone" value="haeyo" current={s.tone} label="해요체" onPick={(v) => set("tone", v)} />
        <Radio name="tone" value="banmal" current={s.tone} label="다정한 반말" onPick={(v) => set("tone", v)} />
      </fieldset>
      <label className="mt-2 block text-sm font-semibold">실행 횟수 제한 (비우면 무제한)<input type="number" min={1} max={100} value={s.max_runs ?? ""} onChange={(e) => set("max_runs", e.target.value ? Number(e.target.value) : null)} className="tap ml-2 w-20 rounded border border-line px-2 font-normal" /></label>
      <button type="button" disabled={act.busy} className="tap mt-2 rounded bg-brand px-4 font-bold text-white" onClick={() => void act.run({ classId, settings: s })}>저장</button>
      {act.error ? <p role="alert" className="text-sm text-err">{act.error}</p> : null}
    </section>
  );
}
