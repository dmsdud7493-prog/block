/** 요청마다 새 서버 클라이언트 (쿠키 세션). 사용자 확인은 getClaims()만 쓴다 (getSession 금지 — verify P5) */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

type Store = Awaited<ReturnType<typeof cookies>>;
type CookieList = { name: string; value: string; options?: Parameters<Store["set"]>[2] }[];

function setCookies(store: Store, list: CookieList) {
  try {
    list.forEach(({ name, value, options }) => store.set(name, value, options));
  } catch {
    // 서버 컴포넌트에서는 쿠키를 쓸 수 없다 — proxy.ts가 세션을 갱신한다
  }
}

export async function createClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => setCookies(store, list),
    },
  });
}
