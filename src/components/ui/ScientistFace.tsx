/**
 * 과학자·선생님 캐리커처 (2026-11-18 사용자 선택: 3안 표정·상황 캐리커처, 자연스러운 눈, 남자 선생님).
 * 그림은 public/characters/<look>.svg — 한 번 받으면 캐시된다. 장식 그림이라 alt는 비워 두고 이름은 옆 글자로 알린다.
 * gray: 아직 모으지 않은 배지(흐리게)
 */
import type { Scientist } from "./scientists";

export type CharacterLook = Scientist["look"] | "teacher";

export default function ScientistFace({ look, size = 64, gray = false, className = "" }: { look: CharacterLook; happy?: boolean; size?: number; gray?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 작은 정적 SVG라 next/image 최적화가 필요 없다
    <img src={`/characters/${look}.svg`} alt="" aria-hidden="true" width={size} height={size} draggable={false} className={`${gray ? "opacity-40 grayscale" : ""} ${className}`} />
  );
}
