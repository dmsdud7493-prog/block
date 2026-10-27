"use client";
/**
 * 학생 계정 (R1·R2·R9): 번호만 입력 → 계정·PIN 생성(한 번만 표시, 출력해서 배부),
 * 보호자 동의서 수령 표시(미표시 학생은 실험 시작 불가), PIN 재발급.
 */
import { useState } from "react";
import type { StudentRow } from "@/lib/teacherTypes";
import { useAction } from "./useAction";
import DangerButton from "./DangerButton";

interface Created { studentNo: string; pin: string | null; error?: string }

function PinSheet({ joinCode, rows }: { joinCode: string; rows: Created[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-3 rounded border-2 border-dashed border-brand p-3">
      <p className="text-sm font-bold">🖨 학생에게 나눠 줄 입장 정보 (이 화면을 닫으면 PIN을 다시 볼 수 없어요 — 인쇄하거나 재발급하세요)</p>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">새로 만든 학생 입장 정보</caption>
        <thead><tr><th scope="col" className="text-left">번호</th><th scope="col" className="text-left">반 코드</th><th scope="col" className="text-left">PIN</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.studentNo}><td>{r.studentNo}</td><td className="font-mono">{joinCode}</td><td className="font-mono">{r.pin ?? r.error}</td></tr>)}</tbody>
      </table>
      <button type="button" className="tap mt-2 rounded border border-line px-3 text-sm" onClick={() => window.print()}>인쇄</button>
    </div>
  );
}

function StudentLine({ s }: { s: StudentRow }) {
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
      <td className="p-2"><button type="button" className="tap rounded border border-line px-2 text-sm" onClick={() => void reissue()}>PIN 재발급</button>{newPin ? <span className="ml-2 font-mono" aria-live="polite">새 PIN {newPin}</span> : null}</td>
      <td className="p-2"><DangerButton label="계정·기록 삭제" warning={`${s.studentNo}의 계정과 실험·대화·보고서 기록이 모두 지워지고 되돌릴 수 없어요.`} confirmLabel="영구 삭제" busy={remove.busy} onConfirm={() => void remove.run({ studentId: s.id })} />{remove.error ? <span role="alert" className="ml-2 text-err">{remove.error}</span> : null}</td>
    </tr>
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
      <PinSheet joinCode={joinCode} rows={created} />
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">학생 목록과 보호자 동의 상태</caption>
        <thead><tr className="bg-slate-100"><th scope="col" className="p-2 text-left">번호</th><th scope="col" className="p-2 text-left">보호자 동의서</th><th scope="col" className="p-2 text-left">PIN</th><th scope="col" className="p-2 text-left">삭제</th></tr></thead>
        <tbody>{students.map((s) => <StudentLine key={s.id} s={s} />)}</tbody>
      </table>
    </section>
  );
}
