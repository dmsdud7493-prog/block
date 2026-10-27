/** R13 학교 망 점검 — 수업 전에 교실 컴퓨터·태블릿에서 열어 차단 여부를 확인한다 */
import type { Metadata } from "next";
import NetCheck from "./NetCheck";

export const metadata: Metadata = { title: "학교 망 점검" };

export default function NetCheckPage() {
  return (
    <main id="main" className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">🛜 학교 망 점검</h1>
      <p>수업 전에 교실 기기에서 이 화면을 열어 보세요. 모두 ✅이면 가상 실험실을 쓸 수 있어요. ❌이 있으면 화면의 주소를 학교 정보 담당 선생님께 알려 허용 목록에 넣어 달라고 요청하세요.</p>
      <NetCheck />
    </main>
  );
}
