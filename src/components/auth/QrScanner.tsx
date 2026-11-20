"use client";
/**
 * 입장 카드 QR 찍기 (2026-11-20 사용자 요청) — 태블릿 카메라로 카드의 QR을 읽어 반 코드·번호·PIN을 채운다.
 * 브라우저에 QR 읽기 기능(BarcodeDetector)이 있으면 그것을, 없으면 jsQR로 읽는다. 창을 닫으면 카메라를 끈다.
 * 카메라를 못 쓰면(권한 거부·카메라 없음) 직접 입력하라고 안내한다.
 */
import { useEffect, useRef, useState } from "react";
import { cardFromQrText, type JoinCard } from "@/lib/joinCard";

interface Detector { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }
type DetectorCtor = new (o: { formats: string[] }) => Detector;

async function makeReader(): Promise<(v: HTMLVideoElement, c: HTMLCanvasElement) => Promise<string | null>> {
  const Ctor = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (Ctor) {
    const d = new Ctor({ formats: ["qr_code"] });
    return async (v) => (await d.detect(v))[0]?.rawValue ?? null;
  }
  const jsQR = (await import("jsqr")).default;
  return async (v, c) => {
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return null;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
  };
}

async function openCamera(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
  } catch {
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

type Reader = Awaited<ReturnType<typeof makeReader>>;
const WRONG = "이 QR은 가상실험실 입장 카드가 아니에요. 선생님께 받은 카드를 비춰 주세요.";

/** 한 번 읽기: 입장 카드면 카드를, 다른 QR이면 "wrong", 아무것도 없으면 null */
async function readOnce(read: Reader, v: HTMLVideoElement, c: HTMLCanvasElement): Promise<JoinCard | "wrong" | null> {
  const text = await read(v, c).catch(() => null);
  if (!text) return null;
  return cardFromQrText(text, window.location.origin) ?? "wrong";
}

function useScan(onCard: (c: JoinCard) => void, setMsg: (m: string) => void) {
  const video = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;
    let stop = false;
    const loop = async (read: Reader) => {
      while (!stop && video.current && canvas.current) {
        const got = await readOnce(read, video.current, canvas.current);
        if (got && got !== "wrong") return onCard(got);
        if (got === "wrong") setMsg(WRONG);
        await new Promise((r) => setTimeout(r, 200));
      }
    };
    const run = async () => {
      try {
        stream = await openCamera();
        if (stop || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        await loop(await makeReader());
      } catch {
        if (!stop) setMsg("카메라를 쓸 수 없어요. 카메라 권한을 허용하거나, 아래 칸에 직접 입력해 주세요.");
      }
    };
    void run();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCard, setMsg]);
  return { video, canvas };
}

/** 카메라 화면 + 노란 네모(여기에 QR을 비추세요) */
function CameraBox({ video }: { video: React.RefObject<HTMLVideoElement | null> }) {
  return (
    <div className="relative mx-auto mt-3 aspect-square w-full max-w-xs overflow-hidden rounded-xl bg-black">
      <video ref={video} muted playsInline aria-label="카메라 화면" className="h-full w-full object-cover" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-[15%] rounded-lg border-4 border-sun" />
    </div>
  );
}

export default function QrScanner({ onCard, onClose }: { onCard: (c: JoinCard) => void; onClose: () => void }) {
  const [msg, setMsg] = useState("입장 카드의 QR을 네모 안에 비춰 주세요.");
  const { video, canvas } = useScan(onCard, setMsg);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="qr-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-panel p-4 text-center shadow-2xl">
        <h2 id="qr-title" className="text-lg font-extrabold text-nav">📷 입장 카드 QR 찍기</h2>
        <CameraBox video={video} />
        <canvas ref={canvas} className="hidden" aria-hidden="true" />
        <p role="status" className="mt-3 min-h-10 text-sm font-semibold text-nav">{msg}</p>
        <button type="button" onClick={onClose} className="tap mt-2 w-full rounded-full border-2 border-line font-bold">닫고 직접 입력하기</button>
      </div>
    </div>
  );
}
