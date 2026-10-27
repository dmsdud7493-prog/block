"use client";
/** 학년 말 반 삭제 (R10) — 반 이름을 그대로 입력해야 지울 수 있다 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/components/lab/api";

export default function ClassDangerZone({ classId, name }: { classId: string; name: string }) {
  const { push: navigate } = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = () => {
    setBusy(true);
    setError(null);
    void postJson<{ deleted: number }>("/api/class/delete", { classId }).then((r) => {
      setBusy(false);
      if (r.error) setError(r.error.message);
      else navigate("/dashboard/classes");
    });
  };
  return (
    <section aria-labelledby="danger-title" className="rounded-lg border-2 border-err bg-red-50 p-3">
      <h2 id="danger-title" className="text-lg font-bold text-err">🗑 반 삭제 (학년 말 데이터 정리)</h2>
      <p className="text-sm">반·과제·모든 학생의 실험·대화·보고서 기록을 지우고, 이 반에만 있던 학생 계정도 지워요. 되돌릴 수 없어요. 필요한 보고서는 먼저 인쇄해 두세요.</p>
      <label className="mt-2 block text-sm font-semibold">확인을 위해 반 이름 “{name}”을 그대로 입력하세요<input value={typed} onChange={(e) => setTyped(e.target.value)} className="tap mt-1 block w-64 rounded border border-line px-2 font-normal" /></label>
      <button type="button" disabled={busy || typed !== name} onClick={remove} className="tap mt-2 rounded bg-err px-4 font-bold text-white disabled:opacity-50">반과 기록 영구 삭제</button>
      {error ? <p role="alert" className="mt-1 text-sm text-err">{error}</p> : null}
    </section>
  );
}
