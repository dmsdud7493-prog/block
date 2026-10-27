import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "물질의 특성 가상실험실", template: "%s · 물질의 특성 가상실험실" },
  description: "블록으로 실험을 설계하고, 예상하고, 가상 실험으로 확인하는 중학교 과학 탐구 실험실",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1d4ed8" };

const SKIP = "sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-panel focus:p-2";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <a href="#main" className={SKIP}>본문으로 바로가기</a>
        {children}
      </body>
    </html>
  );
}
