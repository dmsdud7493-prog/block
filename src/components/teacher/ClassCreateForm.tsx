"use client";
import { useState } from "react";
import { useAction } from "./useAction";

export default function ClassCreateForm() {
  const [name, setName] = useState("");
  const { run, busy, error } = useAction<{ classId: string; joinCode: string }>("/api/class/create");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (await run({ name })) setName("");
    } catch {
      // useAction이 오류 문구를 보여 준다
    }
  };
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-panel p-3">
      <label className="text-sm font-semibold">새 반 이름<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} placeholder="예: 2학년 3반" className="tap ml-2 rounded border border-line px-2 font-normal" /></label>
      <button type="submit" disabled={busy} className="tap rounded bg-brand px-4 font-bold text-white">반 만들기</button>
      {error ? <p role="alert" className="w-full text-sm text-err">{error}</p> : null}
    </form>
  );
}
