/**
 * 학생 입장 카드 QR (2026-11-20 사용자 요청: 번호·PIN을 치지 않고 QR로 바로 입장).
 * QR에는 `<사이트>/login#c=반코드&n=번호&p=PIN` 주소를 담는다.
 * - '#' 뒤(해시)는 서버로 가지 않아 서버 기록·주소 로그에 PIN이 남지 않는다. 읽은 뒤 주소창에서도 지운다.
 * - 카드 = PIN 종이와 같은 보안 수준(카드를 가진 사람이 그 번호로 들어갈 수 있다). 잃어버리면 교사가 PIN을 재발급하면 옛 카드는 못 쓴다.
 * 클라이언트·서버 어디서 써도 되는 순수 함수만 둔다.
 */
export interface JoinCard {
  code: string;
  no: string;
  pin: string;
}

const CODE = /^[A-Z0-9]{6}$/;
const PIN = /^\d{6}$/;

/** 입장 카드 주소 — origin은 교사 화면이 열린 사이트 주소 */
export function joinCardUrl(origin: string, card: JoinCard): string {
  const q = new URLSearchParams({ c: card.code, n: card.no, p: card.pin });
  return `${origin.replace(/\/$/, "")}/login#${q.toString()}`;
}

function fromParams(q: URLSearchParams): JoinCard | null {
  const code = (q.get("c") ?? "").trim().toUpperCase();
  const no = (q.get("n") ?? "").trim();
  const pin = (q.get("p") ?? "").trim();
  if (!CODE.test(code) || !PIN.test(pin) || no.length === 0 || no.length > 20) return null;
  return { code, no, pin };
}

/** 주소의 해시 부분(#c=…&n=…&p=…)에서 카드 읽기 */
export function cardFromHash(hash: string): JoinCard | null {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!h) return null;
  return fromParams(new URLSearchParams(h));
}

/** QR로 읽은 글자에서 카드 읽기 — 같은 사이트의 /login 주소만 받는다(다른 사이트 QR로 엉뚱한 곳에 가지 않게) */
export function cardFromQrText(text: string, origin: string): JoinCard | null {
  try {
    const url = new URL(text.trim());
    const site = new URL(origin);
    if (url.host !== site.host || url.pathname !== "/login") return null;
    return cardFromHash(url.hash);
  } catch {
    return null;
  }
}
