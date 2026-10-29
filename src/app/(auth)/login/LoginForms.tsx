"use client";
import { useActionState, useState } from "react";
import { loginStudent, loginTeacher, signupTeacher, type AuthState } from "./actions";

const INIT: AuthState = { error: null };

function Field({ label, name, type = "text", auto, inputMode, maxLength }: { label: string; name: string; type?: string; auto?: string; inputMode?: "numeric" | "text" | "email"; maxLength?: number }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input name={name} type={type} required autoComplete={auto} inputMode={inputMode} maxLength={maxLength} className="tap mt-1 w-full rounded-xl border-2 border-line px-3 font-normal focus:border-brand" />
    </label>
  );
}

function ErrorText({ state }: { state: AuthState }) {
  return <p className="min-h-5 text-sm text-err" role="alert">{state.error ?? ""}</p>;
}

function StudentForm() {
  const [state, action, pending] = useActionState(loginStudent, INIT);
  return (
    <form action={action} className="space-y-3">
      <Field label="반 코드 (6자리)" name="code" auto="off" maxLength={6} />
      <Field label="번호 (학번 또는 선생님이 정한 번호)" name="no" auto="username" maxLength={20} />
      <Field label="PIN (6자리 숫자)" name="pin" type="password" auto="current-password" inputMode="numeric" maxLength={6} />
      <AiNotice />
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className="tap btn-sun w-full text-lg">{pending ? "들어가는 중…" : "🎒 학생으로 입장"}</button>
    </form>
  );
}

function AiNotice() {
  return (
    <div className="rounded-xl bg-[#eef7fc] p-3 text-sm">
      <p className="font-semibold">🤖 알아 두세요</p>
      <ul className="mt-1 list-inside list-disc text-muted">
        <li>실험 도우미는 사람이 아닌 AI(Claude)예요. 틀린 말을 할 수도 있어요.</li>
        <li>AI와 나눈 대화, 실험 기록, 보고서는 선생님이 볼 수 있어요.</li>
        <li>이름·전화번호 같은 개인정보는 대화창에 쓰지 마세요.</li>
      </ul>
      <label className="tap mt-2 flex items-center gap-2"><input type="checkbox" name="ack" className="h-5 w-5" required />위 내용을 읽었어요</label>
    </div>
  );
}

function TeacherForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, p1] = useActionState(loginTeacher, INIT);
  const [signupState, signupAction, p2] = useActionState(signupTeacher, INIT);
  if (mode === "signup") {
    return (
      <form action={signupAction} className="space-y-3">
        <Field label="이름(표시용)" name="name" auto="name" maxLength={40} />
        <Field label="학교 이메일" name="email" type="email" auto="email" inputMode="email" />
        <Field label="비밀번호 (10자 이상)" name="password" type="password" auto="new-password" />
        <ErrorText state={signupState} />
        <button type="submit" disabled={p2} className="tap w-full rounded-full bg-brand font-bold text-white">교사 가입</button>
        <button type="button" className="tap w-full text-sm underline" onClick={() => setMode("login")}>이미 가입했어요</button>
      </form>
    );
  }
  return (
    <form action={loginAction} className="space-y-3">
      <Field label="학교 이메일" name="email" type="email" auto="email" inputMode="email" />
      <Field label="비밀번호" name="password" type="password" auto="current-password" />
      <ErrorText state={loginState} />
      <button type="submit" disabled={p1} className="tap w-full rounded-full bg-brand font-bold text-white">교사로 입장</button>
      <button type="button" className="tap w-full text-sm underline" onClick={() => setMode("signup")}>처음이에요 · 교사 가입</button>
    </form>
  );
}

export default function LoginForms({ initialRole }: { initialRole: "student" | "teacher" }) {
  const [role, setRole] = useState(initialRole);
  return (
    <div className="mt-5 rounded-2xl bg-panel p-5 shadow-xl">
      <div role="tablist" aria-label="입장 방법" className="mb-4 flex gap-1 rounded-full bg-[#eef1f5] p-1">
        <button role="tab" type="button" aria-selected={role === "student"} className={`tap flex-1 rounded-full font-bold ${role === "student" ? "bg-nav text-white shadow" : "text-muted"}`} onClick={() => setRole("student")}>🎒 학생</button>
        <button role="tab" type="button" aria-selected={role === "teacher"} className={`tap flex-1 rounded-full font-bold ${role === "teacher" ? "bg-nav text-white shadow" : "text-muted"}`} onClick={() => setRole("teacher")}>🧑‍🏫 교사</button>
      </div>
      <div role="tabpanel">{role === "student" ? <StudentForm /> : <TeacherForm />}</div>
    </div>
  );
}
