"use client";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { loginStudent, loginTeacher, signupTeacher, type AuthState } from "./actions";
import QrScanner from "@/components/auth/QrScanner";
import { cardFromHash, type JoinCard } from "@/lib/joinCard";

const INIT: AuthState = { error: null };

function Field({ label, name, type = "text", auto, inputMode, maxLength, value, onChange }: { label: string; name: string; type?: string; auto?: string; inputMode?: "numeric" | "text" | "email"; maxLength?: number; value?: string; onChange?: (v: string) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input name={name} type={type} required autoComplete={auto} inputMode={inputMode} maxLength={maxLength} value={value} onChange={onChange ? (e) => onChange(e.target.value) : undefined} className="tap mt-1 w-full rounded-xl border-2 border-line px-3 font-normal focus:border-brand" />
    </label>
  );
}

function ErrorText({ state }: { state: AuthState }) {
  return <p className="min-h-5 text-sm text-err" role="alert">{state.error ?? ""}</p>;
}

/**
 * 입장 카드 QR (2026-11-20 사용자 요청) — 카드를 태블릿 카메라 앱으로 찍으면 /login#c=…&n=…&p=… 로 들어와 칸이 채워지고,
 * 이 화면의 'QR 찍기'로 찍어도 같다. 읽은 뒤 주소창의 PIN은 바로 지운다. AI 안내 확인란은 매번 학생이 직접 표시한다.
 */
function useJoinCard(autoScan: boolean) {
  const [card, setCard] = useState<JoinCard>({ code: "", no: "", pin: "" });
  const [fromCard, setFromCard] = useState(false);
  const [scanning, setScanning] = useState(false);
  const ackRef = useRef<HTMLInputElement | null>(null);
  const take = useCallback((c: JoinCard) => {
    setCard(c);
    setFromCard(true);
    setScanning(false);
    setTimeout(() => ackRef.current?.focus(), 50);
  }, []);
  useEffect(() => {
    const c = cardFromHash(window.location.hash);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    // 첫 그림이 끝난 뒤 채운다(서버에서 그린 빈 칸과 어긋나지 않게)
    const t = setTimeout(() => (c ? take(c) : autoScan && "mediaDevices" in navigator ? setScanning(true) : undefined), 0);
    return () => clearTimeout(t);
  }, [autoScan, take]);
  const edit = (k: keyof JoinCard) => (v: string) => {
    setFromCard(false);
    setCard((c) => ({ ...c, [k]: v }));
  };
  return { card, fromCard, scanning, setScanning, take, edit, ackRef };
}

function StudentForm({ autoScan }: { autoScan: boolean }) {
  const [state, action, pending] = useActionState(loginStudent, INIT);
  const { card, fromCard, scanning, setScanning, take, edit, ackRef } = useJoinCard(autoScan);
  const close = useCallback(() => setScanning(false), [setScanning]);
  return (
    <form action={action} className="space-y-3">
      <button type="button" onClick={() => setScanning(true)} className="tap w-full rounded-2xl bg-nav py-3 text-lg font-extrabold text-white shadow">📷 입장 카드 QR 찍기</button>
      {scanning ? <QrScanner onCard={take} onClose={close} /> : null}
      {fromCard ? <p role="status" className="rounded-xl bg-[#e5f4e4] p-2 text-sm font-bold text-nav">✅ {card.no}번 입장 카드를 읽었어요. 아래 확인란에 표시하고 입장하세요.</p> : <p className="text-center text-xs text-muted">카드가 없으면 아래에 직접 입력하세요.</p>}
      <Field label="반 코드 (6자리)" name="code" auto="off" maxLength={6} value={card.code} onChange={edit("code")} />
      <Field label="번호 (학번 또는 선생님이 정한 번호)" name="no" auto="username" maxLength={20} value={card.no} onChange={edit("no")} />
      <Field label="PIN (6자리 숫자)" name="pin" type="password" auto="current-password" inputMode="numeric" maxLength={6} value={card.pin} onChange={edit("pin")} />
      <AiNotice ackRef={ackRef} />
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className="tap btn-sun w-full text-lg">{pending ? "들어가는 중…" : "🎒 학생으로 입장"}</button>
    </form>
  );
}

function AiNotice({ ackRef }: { ackRef?: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className="rounded-xl bg-[#eef7fc] p-3 text-sm">
      <p className="font-semibold">🤖 알아 두세요</p>
      <ul className="mt-1 list-inside list-disc text-muted">
        <li>실험 짝꿍 랩메이트는 사람이 아닌 AI(Claude)예요. 틀린 말을 할 수도 있어요.</li>
        <li>AI와 나눈 대화, 실험 기록, 보고서는 선생님이 볼 수 있어요.</li>
        <li>이름·전화번호 같은 개인정보는 대화창에 쓰지 마세요.</li>
      </ul>
      <label className="tap mt-2 flex items-center gap-2"><input ref={ackRef} type="checkbox" name="ack" className="h-5 w-5" required />위 내용을 읽었어요</label>
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

export default function LoginForms({ initialRole, autoScan = false }: { initialRole: "student" | "teacher"; autoScan?: boolean }) {
  const [role, setRole] = useState(initialRole);
  return (
    <div className="mt-5 rounded-2xl bg-panel p-5 shadow-xl">
      <div role="tablist" aria-label="입장 방법" className="mb-4 flex gap-1 rounded-full bg-[#eef1f5] p-1">
        <button role="tab" type="button" aria-selected={role === "student"} className={`tap flex-1 rounded-full font-bold ${role === "student" ? "bg-nav text-white shadow" : "text-muted"}`} onClick={() => setRole("student")}>🎒 학생</button>
        <button role="tab" type="button" aria-selected={role === "teacher"} className={`tap flex-1 rounded-full font-bold ${role === "teacher" ? "bg-nav text-white shadow" : "text-muted"}`} onClick={() => setRole("teacher")}>🧑‍🏫 교사</button>
      </div>
      <div role="tabpanel">{role === "student" ? <StudentForm autoScan={autoScan} /> : <TeacherForm />}</div>
    </div>
  );
}
