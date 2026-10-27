/** S7 수용 기준: Realtime 구독은 교사 화면에서만, 학생 화면에 반 평균·순위 문자열 0건 (D11·verify P6·차원 3) */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../../src");
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
  .filter((f) => /\.(ts|tsx)$/.test(f));
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join("/");
const ALL = walk(ROOT);
const STUDENT_AREAS = ["components/lab/", "components/report/", "components/tutor/", "components/data/", "components/inquiry/", "components/monitor/", "components/blocks/", "app/lab/", "app/demo/"];

describe("교사/학생 화면 경계", () => {
  it("Realtime 채널 구독(.channel()은 교사 대시보드 코드에만 있다", () => {
    const users = ALL.filter((f) => fs.readFileSync(f, "utf8").includes(".channel(")).map(rel);
    expect(users.length).toBeGreaterThan(0);
    expect(users.every((f) => f.startsWith("components/teacher/") || f.startsWith("app/dashboard/"))).toBe(true);
  });
  it("학생 화면 코드에 반 평균·순위·등수 표현이 없다", () => {
    const hits = ALL.filter((f) => STUDENT_AREAS.some((a) => rel(f).startsWith(a)))
      .filter((f) => /반\s*평균|평균\s*점수|순위|등수|랭킹|ranking|leaderboard/i.test(fs.readFileSync(f, "utf8")))
      .map(rel);
    expect(hits).toEqual([]);
  });
  it("학생 화면은 교사 대시보드 모듈(events/fold·cards)을 쓰지 않는다", () => {
    const hits = ALL.filter((f) => STUDENT_AREAS.some((a) => rel(f).startsWith(a)))
      .filter((f) => /lib\/events\/(fold|cards)|lib\/server\/dashboard/.test(fs.readFileSync(f, "utf8")))
      .map(rel);
    expect(hits).toEqual([]);
  });
});
