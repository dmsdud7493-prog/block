"use client";
/** 보고서 상태 — 2초 자동저장(세션), 제출, 잠금 */
import { useEffect, useRef, useState } from "react";
import { postJson } from "@/components/lab/api";
import type { ReportContent } from "@/lib/report/template";

export type Updater = (c: ReportContent) => ReportContent;

export function useReport(initial: ReportContent, opts: { sessionId?: string; locked: boolean; initialAi: string[] }) {
  const [content, setContent] = useState<ReportContent>(initial);
  const [aiAssisted, setAi] = useState<string[]>(opts.initialAi);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ late: boolean; version: number } | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current || !opts.sessionId || opts.locked || submitted) {
      first.current = false;
      return undefined;
    }
    const t = setTimeout(async () => {
      setSaved("saving");
      try {
        const res = await postJson("/api/report/draft", { sessionId: opts.sessionId, content, aiAssisted }, "PUT");
        setSaved(res.error ? "error" : "saved");
      } catch {
        setSaved("error");
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [content, aiAssisted, opts.sessionId, opts.locked, submitted]);

  const update = (fn: Updater) => setContent((c) => {
    const next = fn(c);
    return next;
  });

  const submit = async () => {
    if (!opts.sessionId) return;
    setSubmitError(null);
    try {
      const res = await postJson<{ late: boolean; version: number }>("/api/report/submit", { sessionId: opts.sessionId, content, aiAssisted });
      if (res.data) setSubmitted(res.data);
      else setSubmitError(res.error?.message ?? "제출하지 못했어요.");
    } catch {
      setSubmitError("제출하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return { content, update, aiAssisted, setAi, saved, submit, submitError, submitted };
}
