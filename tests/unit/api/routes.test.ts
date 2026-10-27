/** Route Handler 경계: 인증·입력 검증·DB 게이트 → HTTP 상태 (plan S3·S5 수용 기준) */
import { beforeEach, describe, expect, it, vi } from "vitest";

const user = vi.hoisted(() => ({ current: null as null | { id: string; role: string; displayName: string; consentOnFile: boolean } }));
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/auth", () => ({ currentUser: async () => user.current }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: rpcMock }) }));

import { POST as start } from "@/app/api/session/start/route";
import { POST as predict } from "@/app/api/predict/route";
import { POST as classCreate } from "@/app/api/class/create/route";

const req = (body: unknown) => new Request("http://x/api", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const SID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  user.current = { id: "u1", role: "student", displayName: "20301", consentOnFile: true };
  rpcMock.mockReset();
});

describe("route 경계", () => {
  it("로그인 없으면 401", async () => {
    user.current = null;
    const res = await start(req({ assignmentId: SID }));
    expect(res.status).toBe(401);
  });
  it("입력 형식이 틀리면 422", async () => {
    const res = await start(req({ assignmentId: "not-a-uuid" }));
    expect(res.status).toBe(422);
  });
  it("학생은 교사 API를 부를 수 없다 (403)", async () => {
    const res = await classCreate(req({ name: "x" }));
    expect(res.status).toBe(403);
  });
  it("DB가 consent_required를 던지면 403과 안내 문구 (R1)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "consent_required", details: null } });
    const res = await start(req({ assignmentId: SID }));
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.error.code).toBe("consent_required");
    expect(json.error.message).toContain("보호자 동의서");
  });
  it("예측 이유가 5자 미만이면 422 (지침 3.1)", async () => {
    const res = await predict(req({ sessionId: SID, runNo: null, target: "t", choice: "c", rationale: "몰라", hintsUsed: 0 }));
    expect(res.status).toBe(422);
  });
  it("알 수 없는 내부 오류는 메시지를 숨긴다", async () => {
    rpcMock.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.1:5432 password=secret"));
    const res = await start(req({ assignmentId: SID }));
    const json = await res.json();
    expect(res.status).toBe(503);
    expect(JSON.stringify(json)).not.toContain("secret");
  });
});

import { POST as grade } from "@/app/api/grade/route";
import { POST as events } from "@/app/api/events/route";

describe("S7 채점·이벤트 경계", () => {
  const body = { submissionId: SID, action: "return", rubric: { data: "mid" }, feedback: "좋아요" };
  it("학생은 채점 API를 부를 수 없다 (403)", async () => {
    expect((await grade(req(body))).status).toBe(403);
  });
  it("루브릭 값이 상/중/하가 아니면 422", async () => {
    user.current = { id: "t1", role: "teacher", displayName: "교사", consentOnFile: true };
    expect((await grade(req({ ...body, rubric: { data: "A+" } }))).status).toBe(422);
  });
  it("DB가 invalid_rubric을 던지면 422와 안내 문구", async () => {
    user.current = { id: "t1", role: "teacher", displayName: "교사", consentOnFile: true };
    rpcMock.mockResolvedValue({ data: null, error: { message: "invalid_rubric", details: null } });
    const json = await (await grade(req(body))).json();
    expect(json.error.code).toBe("invalid_rubric");
    expect(json.error.message).toContain("4항목");
  });
  it("draft는 app_save_grade_draft, return은 app_return_submission을 부른다", async () => {
    user.current = { id: "t1", role: "teacher", displayName: "교사", consentOnFile: true };
    rpcMock.mockResolvedValue({ data: "2026-10-27T00:00:00Z", error: null });
    await grade(req({ ...body, action: "draft" }));
    await grade(req(body));
    expect(rpcMock.mock.calls.map((c) => c[0])).toEqual(["app_save_grade_draft", "app_return_submission"]);
  });
  it("학생 브라우저가 서버 전용 이벤트(제출·플래그)를 보내면 422", async () => {
    const res = await events(req({ sessionId: SID, events: [{ type: "report_submitted", payload: {} }] }));
    expect(res.status).toBe(422);
  });
});

import { POST as deleteStudent } from "@/app/api/class/student-delete/route";
import { POST as deleteClass } from "@/app/api/class/delete/route";

describe("S9 삭제 경계 (R10)", () => {
  it("학생은 삭제 API를 부를 수 없다", async () => {
    expect((await deleteStudent(req({ studentId: SID }))).status).toBe(403);
    expect((await deleteClass(req({ classId: SID }))).status).toBe(403);
  });
  it("다른 교사 반 학생이면 DB forbidden → 403", async () => {
    user.current = { id: "t1", role: "teacher", displayName: "교사", consentOnFile: true };
    rpcMock.mockResolvedValue({ data: null, error: { message: "forbidden", details: null } });
    expect((await deleteStudent(req({ studentId: SID }))).status).toBe(403);
  });
  it("성공하면 지운 세션 수를 돌려준다", async () => {
    user.current = { id: "t1", role: "teacher", displayName: "교사", consentOnFile: true };
    rpcMock.mockResolvedValue({ data: 3, error: null });
    expect((await (await deleteStudent(req({ studentId: SID }))).json()).data).toEqual({ sessions: 3 });
    expect(rpcMock.mock.calls[0][0]).toBe("app_delete_student");
  });
});
