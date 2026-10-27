import type { NextConfig } from "next";

// cacheComponents는 끈다: 거의 모든 화면이 로그인 사용자별 동적 데이터이므로
// 정적 셸 이점보다 Suspense 경계 강제 비용이 크다 (docs/decision-log.md ADR-P01).
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
};

export default nextConfig;
