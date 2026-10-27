"use client";
/** 점검 항목: 앱 서버 응답·지연, 블록 그림 파일, 데이터베이스 주소, 실시간 연결(WebSocket) */
import { useEffect, useState } from "react";
import { SUPABASE_URL } from "@/lib/supabase/env";

type Status = "wait" | "ok" | "fail" | "skip";
interface Item { id: string; label: string; target: string; status: Status; detail: string }

const ICON: Record<Status, string> = { wait: "⏳", ok: "✅", fail: "❌", skip: "➖" };
const ms = (t0: number) => `${Math.round(performance.now() - t0)} ms`;

function timed(url: string, init?: RequestInit): Promise<{ ok: boolean; detail: string; body: unknown }> {
  const t0 = performance.now();
  return fetch(url, { cache: "no-store", ...init })
    .then(async (r) => ({ ok: r.ok || r.status === 401 || r.status === 404, detail: `${r.status} · ${ms(t0)}`, body: await r.json().catch(() => null) }))
    .catch(() => ({ ok: false, detail: `연결 안 됨 · ${ms(t0)}`, body: null }));
}

function websocket(url: string): Promise<{ ok: boolean; detail: string }> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const ws = new WebSocket(url);
    const done = (ok: boolean, why: string) => {
      ws.close();
      resolve({ ok, detail: `${why} · ${ms(t0)}` });
    };
    const timer = setTimeout(() => done(false, "시간 초과"), 6000);
    ws.onopen = () => { clearTimeout(timer); done(true, "열림"); };
    ws.onerror = () => { clearTimeout(timer); done(false, "막힘"); };
  });
}

async function runChecks(): Promise<Item[]> {
  try {
    const origin = window.location.origin;
    const health = await timed("/api/health");
    const cfg = health.body as { database?: boolean; ai?: boolean } | null;
    const media = await timed("/blockly-media/sprites.svg").then((r) => ({ ...r, ok: r.detail.startsWith("200") }));
    const db = SUPABASE_URL ? await timed(`${SUPABASE_URL}/auth/v1/health`) : null;
    const rt = SUPABASE_URL ? await websocket(`${SUPABASE_URL.replace(/^http/, "ws")}/realtime/v1/websocket?vsn=1.0.0`) : null;
    return [
      { id: "app", label: "가상 실험실 서버", target: origin, status: health.ok ? "ok" : "fail", detail: health.detail },
      { id: "media", label: "블록 그림 파일", target: `${origin}/blockly-media/`, status: media.ok ? "ok" : "fail", detail: media.detail },
      { id: "db", label: "저장소(로그인·기록)", target: SUPABASE_URL || "설정 안 됨", status: db ? (db.ok ? "ok" : "fail") : "skip", detail: db?.detail ?? "체험 모드만 쓸 수 있어요" },
      { id: "rt", label: "교사 대시보드 실시간 연결", target: SUPABASE_URL ? `${SUPABASE_URL.replace(/^http/, "ws")}/realtime/v1` : "설정 안 됨", status: rt ? (rt.ok ? "ok" : "fail") : "skip", detail: rt?.detail ?? "막혀 있어도 30초마다 새로고침으로 동작해요" },
      { id: "ai", label: "AI 도우미(서버에서 연결)", target: "서버 설정", status: cfg?.ai ? "ok" : "skip", detail: cfg?.ai ? "설정됨" : "설정 안 됨 — 규칙 기반 도우미로 동작해요" },
    ];
  } catch {
    return [];
  }
}

export default function NetCheck() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let alive = true;
    void runChecks().then((r) => { if (alive) setItems(r); });
    return () => { alive = false; };
  }, [round]);
  return (
    <section aria-labelledby="nc-title" className="space-y-2">
      <h2 id="nc-title" className="font-bold">점검 결과</h2>
      <ul className="space-y-2" aria-live="polite" aria-busy={items === null}>
        {(items ?? []).map((i) => <li key={i.id} className="rounded border border-line bg-panel p-2 text-sm"><span aria-hidden="true">{ICON[i.status]} </span><strong>{i.label}</strong> — <span className="sr-only">{i.status === "ok" ? "정상" : i.status === "fail" ? "막힘" : "해당 없음"}, </span>{i.detail}<br /><code className="break-all text-xs">{i.target}</code></li>)}
      </ul>
      {items === null ? <p>점검하는 중…</p> : null}
      <button type="button" className="tap rounded border border-line px-3" onClick={() => { setItems(null); setRound((n) => n + 1); }}>다시 점검</button>
    </section>
  );
}
