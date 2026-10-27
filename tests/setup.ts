// server-only 패키지는 Next 번들러 밖(Vitest)에서 import 시 오류를 던지므로 테스트에서는 무력화한다.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));

// 라우트 테스트용 더미 설정 (실제 네트워크 호출은 각 테스트에서 mock)
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "test-publishable";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service";
