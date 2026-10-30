/**
 * 오늘의 미션 진행 — 계산값을 맞힌 대상과 실행 기록의 이벤트로 미션 완료를 판단한다(정답값은 쓰지 않음, 규칙 3).
 * 미션은 순서대로 열린다: 앞 미션을 모두 마쳐야 그 미션도 완료로 센다(먼저 해 본 것은 앞 미션을 마치는 순간 함께 완료).
 */
import type { AnyCatalog, MissionDef } from "@/lib/engine/experiments/types";
import type { LabState } from "./types";

export interface MissionProgress {
  missions: MissionDef[];
  done: boolean[];
  /** 지금 할 미션 번호(모두 마쳤으면 missions.length) */
  current: number;
}

/** 계산값을 맞힌 대상(subject) — 계산 요청 key로 실행 기록에서 대상을 찾는다 */
function solvedSubjects(s: LabState): Set<string> {
  const subjectOf = new Map(s.runs.flatMap((r) => r.calcRequests.map((c) => [c.key, c.subject] as const)));
  return new Set(Object.values(s.calc).filter((e) => e.correct).map((e) => subjectOf.get(e.key)).filter((x): x is string => Boolean(x)));
}

function eventSeen(s: LabState, want: NonNullable<MissionDef["done"]["event"]>): boolean {
  return s.runs.some((r) => r.frames.some((f) => {
    if (want.type && f.event.type !== want.type) return false;
    const settled = Array.isArray(f.event.settled) ? (f.event.settled as unknown[]) : [];
    return want.settled.every((x) => settled.includes(x));
  }));
}

function isDone(m: MissionDef, solved: Set<string>, s: LabState): boolean {
  const okSolved = (m.done.solved ?? []).every((x) => solved.has(x));
  const okEvent = m.done.event ? eventSeen(s, m.done.event) : true;
  return okSolved && okEvent;
}

export function missionProgress(catalog: AnyCatalog, s: LabState): MissionProgress {
  const missions = catalog.missions ?? [];
  const solved = solvedSubjects(s);
  const own = missions.map((m) => isDone(m, solved, s));
  const done = own.map((d, i) => d && own.slice(0, i).every(Boolean));
  const first = done.findIndex((d) => !d);
  return { missions, done, current: first < 0 ? missions.length : first };
}

/** 튜터에게 알려 줄 지금 미션 문장 */
export const currentMissionTitle = (p: MissionProgress): string | null => p.missions[p.current]?.title ?? null;
