"use client";
/** 교사 화면 공통: POST 후 화면 새로고침, 진행·오류 상태 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/components/lab/api";

export function useAction<T>(url: string) {
  const { refresh } = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (body: unknown): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      const res = await postJson<T>(url, body);
      if (res.error) setError(res.error.message);
      else refresh();
      return res.data;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, error };
}
