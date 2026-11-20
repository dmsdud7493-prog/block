"use client";
/**
 * 학생 계정 (R1·R2·R9): 번호만 입력 → 계정·PIN 생성(한 번만 표시, QR 입장 카드로 인쇄해 배부 — 2026-11-20),
 * 보호자 동의서 수령 표시(미표시 학생은 실험 시작 불가), PIN 재발급.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/components/lab/api";
import type { StudentRow } from "@/lib/teacherTypes";
import { useAction } from "./useAction";
import DangerButton from "./DangerButton";
import JoinCards from "./JoinCards";

interface Created { studentNo: string; pin: string | null; error?: string }

function PinSheet({ joinCode, rows }: { joinCode: string; rows: Created[] }) {
  return <JoinCards joinCode={joinCode} rows={rows} title="🖨 학생에게 나눠 줄 입장 카드 (이 화면을 닫으면 PIN을 다시 볼 수 없어요 — 바로 인쇄하거나 재발급하세요)" />;
}

function StudentLine({ s, joinCode }: { s: StudentRow; joinCode: string }) {
  const consent = useAction("/api/class/consent");
  const pin = useAction<{ pin: string }>("/api/class/pin");
  const [newPin, setNewPin] = useState<string | null>(null);
  const remove = useAction<{ sessions: number }>("/api/class/student-delete");
  const reissue = async () => {
    try {
      const r = await pin.run({ studentId: s.id });
      setNewPin(r?.pin ?? null);
    } catch {
      setNewPin(null);
    }
  };
  return (
    <tr className="border-t border-line">
      <th scope="row" className="p-2 text-left">{s.studentNo}</th>
      <td className="p-2"><label className="tap flex items-center gap-2"><input type="checkbox" checked={s.consentOnFile} disabled={consent.busy} onChange={(e) => void consent.run({ studentId: s.id, onFile: e.target.checked })} />{s.consentOnFile ? `수령 (${s.consentDate ?? ""})` : "미수령"}</label></td>
      <td className="p-2"><button type="button" className="tap rounded border border-line px-2 text-sm" onClick={() => void reissue()}>PIN 재발급</button>{newPin ? <span className="ml-2 font-mono" aria-live="polite">새 PIN {newPin}</span> : null}{newPin ? <JoinCards joinCode={joinCode} rows={[{ studentNo: s.studentNo, pin: newPin }]} title="새 입장 카드 (옛 카드는 이제 쓸 수 없어요)" /> : null}</td>
      <td className="p-2"><DangerButton label="계정·기록 삭제" warning={`${s.studentNo}의 계정과 실험·대화·보고서 기록이 모두 지워지고 되돌릴 수 없어요.`} confirmLabel="영구 삭제" busy={remove.busy} onConfirm={() => void remove.run({ studentId: s.id })} />{remove.error ? <span role="alert" className="ml-2 text-err">{remove.error}</span> : null}</td>
    </tr>
  );
}

/**
 * 반 전체 동의서 수령 표시 (2026-11-18, 28명 한 반 수업 점검) — 한 명씩 체크하면 28번 눌러야 한다.
 * 실제로 받은 경우에만 쓰도록 같은 자리에서 한 번 더 확인한다. 기존 app_set_consent를 학생마다 부른다(DB 변경 없음).
 */
function ConsentAll({ students }: { students: StudentRow[] }) {
  const { refresh } = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const todo = students.filter((s) => !s.consentOnFile);
  if (todo.length === 0) return null;
  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await Promise.all(todo.map((s) => postJson("/api/class/consent", { studentId: s.id, onFile: true })));
      const failed = res.filter((r) => r.error).length;
      setMsg(failed ? `${todo.length - failed}명 표시, ${failed}명은 다시 눌러 주세요.` : `${todo.length}명 모두 수령으로 표시했어요.`);
    } catch {
      setMsg("연결이 끊겼어요. 다시 눌러 주세요.");
    } finally {
      setBusy(false);
      refresh();
    }
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <DangerButton label={`✅ 미수령 ${todo.length}명 모두 수령 표시`} warning="보호자 동의서를 실제로 모두 받았을 때만 눌러 주세요." confirmLabel="모두 수령 표시" busy={busy} onConfirm={() => void run()} />
      {msg ? <span role="status">{msg}</span> : null}
    </div>
  );
}

/**
 * 반 전체 PIN 재발급 + 입장 카드 한꺼번에 인쇄 (2026-11-20 사용자 요청).
 * 되돌릴 수 없으므로(옛 PIN·옛 카드가 모두 무효) 같은 자리에서 한 번 더 확인한다.
 */
function ReissueAll({ classId, count, onDone }: { classId: string; count: number; onDone: (rows: Created[]) => void }) {
  const act = useAction<{ created: Created[] }>("/api/class/pins");
  const [round, setRound] = useState(0); // 끝나면 확인 상자를 닫는다(새로 그리기)
  const run = async () => {
    try {
      const r = await act.run({ classId });
      if (r) onDone(r.created);
    } catch {
      onDone([]);
    } finally {
      setRound((n) => n + 1);
    }
  };
  if (count === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <DangerButton key={round} label={`🔄 반 전체(${count}명) PIN 재발급·입장 카드 인쇄`} warning="모든 학생의 옛 PIN과 이미 나눠 준 입장 카드는 더 이상 쓸 수 없게 돼요. 새 카드를 바로 인쇄해 나눠 주세요." confirmLabel="모두 재발급" busy={act.busy} onConfirm={() => void run()} />
      {act.busy ? <span role="status">새 PIN을 만드는 중… (학생 수만큼 몇 초 걸려요)</span> : null}
      {act.error ? <span role="alert" className="text-err">{act.error}</span> : null}
    </div>
  );
}

export default function StudentManager({ classId, joinCode, students }: { classId: string; joinCode: string; students: StudentRow[] }) {
  const [nos, setNos] = useState("");
  const [created, setCreated] = useState<Created[]>([]);
  const add = useAction<{ created: Created[] }>("/api/class/students");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const list = nos.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
      const r = await add.run({ classId, studentNos: list });
      if (r) {
        setCreated(r.created);
        setNos("");
      }
    } catch {
      setCreated([]);
    }
  };
  return (
    <section aria-labelledby="stu-title" className="rounded-lg border border-line bg-panel p-3">
      <h2 id="stu-title" className="text-lg font-bold">👩‍🎓 학생 ({students.length}명)</h2>
      <p className="text-sm text-muted">이름·이메일은 받지 않아요. 번호(학번)만 입력하면 계정과 PIN이 만들어져요. 보호자 동의서를 받은 학생만 실험을 시작할 수 있어요.</p>
      <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold">번호 목록 (줄바꿈·쉼표로 구분)<textarea value={nos} onChange={(e) => setNos(e.target.value)} className="mt-1 block h-20 w-72 rounded border border-line p-1 font-normal" placeholder={"20301\n20302\n20303"} /></label>
        <button type="submit" disabled={add.busy || !nos.trim()} className="tap rounded bg-brand px-4 font-bold text-white">계정 만들기</button>
      </form>
      {add.error ? <p role="alert" className="text-sm text-err">{add.error}</p> : null}
      <ReissueAll classId={classId} count={students.length} onDone={setCreated} />
      <PinSheet joinCode={joinCode} rows={created} />
      <ConsentAll students={students} />
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">학생 목록과 보호자 동의 상태</caption>
        <thead><tr className="bg-slate-100"><th scope="col" className="p-2 text-left">번호</th><th scope="col" className="p-2 text-left">보호자 동의서</th><th scope="col" className="p-2 text-left">PIN</th><th scope="col" className="p-2 text-left">삭제</th></tr></thead>
        <tbody>{students.map((s) => <StudentLine key={s.id} s={s} joinCode={joinCode} />)}</tbody>
      </table>
    </section>
  );
}
