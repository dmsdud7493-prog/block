/** 교사 화면 이동 단추 — 밑줄 글씨 대신 눈에 띄는 단추 모양 (2026-11-21). 인쇄할 때는 숨긴다 */
import Link from "next/link";

const TONE = {
  plain: "border-line bg-white text-ink hover:bg-slate-50",
  brand: "border-brand bg-brand text-white hover:opacity-90",
};

export default function NavButton({ href, children, tone = "plain" }: { href: string; children: React.ReactNode; tone?: keyof typeof TONE }) {
  return <Link href={href} className={`tap inline-flex items-center gap-1 rounded-lg border-2 px-3 text-sm font-bold shadow-sm print:hidden ${TONE[tone]}`}>{children}</Link>;
}

export const NavRow = ({ children }: { children: React.ReactNode }) => <nav aria-label="화면 이동" className="flex flex-wrap gap-2 print:hidden">{children}</nav>;
