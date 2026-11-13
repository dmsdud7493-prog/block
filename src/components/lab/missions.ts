/**
 * 오늘의 미션 진행 — 계산값을 맞힌 대상과 실행 기록의 이벤트로 미션 완료를 판단한다(정답값은 쓰지 않음, 규칙 3).
 * 미션은 순서대로 열린다: 앞 미션을 모두 마쳐야 그 미션도 완료로 센다(먼저 해 본 것은 앞 미션을 마치는 순간 함께 완료).
 */
import type { AnyCatalog, MissionDef } from "@/lib/engine/experiments/types";
import type { LabState, RunRecord } from "./types";

export interface MissionProgress {
  missions: MissionDef[];
  done: boolean[];
  /** 지금 할 미션 번호(모두 마쳤으면 missions.length) */
  current: number;
}

/** 계산 요청 하나의 이름표 — 대상, 그리고 같은 회차에 온도를 쟀으면 "대상@온도"(예: kno3@60) */
function tagsOf(r: RunRecord, c: RunRecord["calcRequests"][number]): string[] {
  const t = r.measurements.find((m) => m.key === `temp.${c.subject}.t${c.trial}`);
  return t ? [c.subject, `${c.subject}@${t.value}`] : [c.subject];
}

/** 이 실행에서 맞힌 계산값의 이름표들 */
function solvedTagsIn(s: LabState, r: RunRecord): string[] {
  return r.calcRequests.filter((c) => s.calc[c.key]?.correct && s.calc[c.key]?.runNo === r.runNo).flatMap((c) => tagsOf(r, c));
}

/** 계산값을 맞힌 대상(subject)과 "대상@온도" — 계산 요청 key로 실행 기록에서 대상을 찾는다 */
function solvedSubjects(s: LabState): Set<string> {
  const loose = new Map(s.runs.flatMap((r) => r.calcRequests.map((c) => [c.key, c.subject] as const)));
  const tagged = s.runs.flatMap((r) => solvedTagsIn(s, r));
  const plain = Object.values(s.calc).filter((e) => e.correct).map((e) => loose.get(e.key)).filter((x): x is string => Boolean(x));
  return new Set([...plain, ...tagged]);
}

/** 이 실행에 미션이 바라는 장면(이벤트)이 나왔는가 */
export function runShowsEvent(r: RunRecord, want: NonNullable<MissionDef["done"]["event"]>): boolean {
  return r.frames.some((f) => {
    if (want.type && f.event.type !== want.type) return false;
    const settled = Array.isArray(f.event.settled) ? (f.event.settled as unknown[]) : [];
    return (want.settled ?? []).every((x) => settled.includes(x));
  });
}

const eventSeen = (s: LabState, want: NonNullable<MissionDef["done"]["event"]>): boolean => s.runs.some((r) => runShowsEvent(r, want));

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

export const allMissionsDone = (p: MissionProgress): boolean => p.missions.length > 0 && p.current >= p.missions.length;

/** 미션마다 그 미션을 마친 실행 — 계산값 미션은 맞힌 대상이 가장 많은 실행(같으면 나중 것), 장면 미션은 그 장면이 나온 마지막 실행 */
export function missionRuns(catalog: AnyCatalog, s: LabState): RunRecord[] | null {
  const p = missionProgress(catalog, s);
  if (!allMissionsDone(p)) return null;
  const found = p.missions.map((m) => runFor(m, s));
  return found.every((r): r is RunRecord => r !== null) ? found : null;
}

function runFor(m: MissionDef, s: LabState): RunRecord | null {
  const want = m.done.solved ?? [];
  if (want.length === 0) return m.done.event ? [...s.runs].reverse().find((r) => r.ok && runShowsEvent(r, m.done.event!)) ?? null : null;
  // 바라는 것을 가장 많이 맞힌 실행 — 같으면 다른 미션 것이 덜 섞인 실행, 그래도 같으면 나중 것
  const score = (r: RunRecord) => {
    const tags = solvedTagsIn(s, r);
    const hit = want.filter((w) => tags.includes(w)).length;
    const extra = new Set(tags.filter((t) => t.includes("@") && !want.includes(t))).size;
    return hit === 0 ? -1 : hit - extra * 0.1;
  };
  return s.runs.reduce<RunRecord | null>((b, r) => (score(r) >= 0 && (!b || score(r) >= score(b)) ? r : b), null);
}
