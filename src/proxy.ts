/**
 * Next 16 Proxy — Supabase 세션 쿠키 갱신 + 보호 경로 낙관적 검사.
 * 진짜 권한 검사는 각 Route Handler·서버 컴포넌트·DB(RLS/서버 함수)에서 다시 한다.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const PROTECTED = ["/lab", "/dashboard"];

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    const needsAuth = PROTECTED.some((p) => request.nextUrl.pathname.startsWith(p));
    return needsAuth ? NextResponse.redirect(new URL("/login?setup=1", request.url)) : NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  try {
    const { data } = await supabase.auth.getClaims();
    const signedIn = Boolean(data?.claims?.sub);
    if (!signedIn && PROTECTED.some((p) => request.nextUrl.pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    // 인증 서버에 닿지 않으면 페이지 쪽 검사에 맡긴다
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|blockly-media|api/demo).*)"],
};
