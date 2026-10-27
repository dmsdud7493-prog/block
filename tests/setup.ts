// server-only 패키지는 Next 번들러 밖(Vitest)에서 import 시 오류를 던지므로 테스트에서는 무력화한다.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
