/** 학생 입장 카드 QR 주소 (2026-11-20) — PIN은 해시(#)에만, 다른 사이트 QR은 거절 */
import { describe, expect, it } from "vitest";
import { cardFromHash, cardFromQrText, joinCardUrl } from "@/lib/joinCard";

const card = { code: "AB12CD", no: "2701", pin: "123456" };
const site = "https://matter-lab.example";

describe("입장 카드 QR", () => {
  it("주소는 /login# 뒤에만 반 코드·번호·PIN을 담는다(서버로 가는 ? 쿼리에는 없음)", () => {
    const url = new URL(joinCardUrl(site, card));
    expect(url.pathname).toBe("/login");
    expect(url.search).toBe("");
    expect(url.hash).toContain("p=123456");
  });

  it("만든 주소를 다시 읽으면 같은 카드가 나온다(번호에 특수문자가 있어도)", () => {
    const odd = { ...card, no: "2-7 01&a" };
    expect(cardFromQrText(joinCardUrl(site, odd), site)).toEqual(odd);
    expect(cardFromHash(new URL(joinCardUrl(site, card)).hash)).toEqual(card);
  });

  it("반 코드는 대문자로 맞추고, 형식이 틀리면 거절한다", () => {
    expect(cardFromHash("#c=ab12cd&n=1&p=123456")?.code).toBe("AB12CD");
    expect(cardFromHash("#c=AB12CD&n=1&p=12345")).toBeNull();
    expect(cardFromHash("#c=AB12&n=1&p=123456")).toBeNull();
    expect(cardFromHash("#c=AB12CD&n=&p=123456")).toBeNull();
    expect(cardFromHash("")).toBeNull();
  });

  it("다른 사이트나 다른 경로의 QR은 읽지 않는다", () => {
    expect(cardFromQrText(joinCardUrl("https://evil.example", card), site)).toBeNull();
    expect(cardFromQrText(`${site}/lab#c=AB12CD&n=1&p=123456`, site)).toBeNull();
    expect(cardFromQrText("그냥 글자", site)).toBeNull();
  });
});
