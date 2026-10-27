/**
 * 개인정보 처리방침 (R3·R5·R6·R10, plan S9) — 국외 이전 고지 항목(법 제30조 제1항 제8호·시행령 제31조):
 * 법적 근거 / 이전 항목 / 국가·시기·방법 / 이전받는 자 / 이용 목적·보유 기간 / 거부 방법·거부 시 효과.
 * ⚠ 법률 검토 전 초안 — 학교·교육청 개인정보 담당자 확인 후 확정한다(docs/compliance-checklist.md).
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "개인정보 처리방침" };

interface Transfer { who: string; country: string; items: string; when: string; purpose: string; keep: string; link: string }

const TRANSFERS: Transfer[] = [
  {
    who: "Supabase, Inc. (데이터베이스·로그인)",
    country: "운영사 소재지 미국 · 데이터 저장 위치는 운영자가 고른 지역(이 서비스는 대한민국 서울 지역으로 설정)",
    items: "학생: 반 번호(학번), 내부용 로그인 ID, PIN의 암호화 값, 블록 실험 설계·실행 기록, 예상·계산값, AI 도우미와 나눈 대화, 보고서 / 교사: 이메일, 이름",
    when: "서비스를 쓸 때마다 암호화된 네트워크(TLS)로 전송·저장",
    purpose: "계정 확인, 실험 기록·보고서 저장, 교사 대시보드 제공",
    keep: "선생님이 지우거나, 학년 종료 후 학교가 정한 기간이 지나면 삭제",
    link: "https://supabase.com/privacy",
  },
  {
    who: "Vercel Inc. (웹 서비스 호스팅)",
    country: "운영사 소재지 미국 · 서버 실행 지역은 대한민국 서울(icn1)로 설정",
    items: "화면 요청을 처리하는 동안 지나가는 위 정보, 접속 기록(IP 주소, 접속 시각, 브라우저 정보)",
    when: "화면을 열거나 버튼을 누를 때마다 암호화된 네트워크(TLS)로 전송",
    purpose: "웹 화면 제공, 장애 대응·보안",
    keep: "Vercel의 로그 보존 정책에 따름(요청 처리 후 저장하지 않는 것이 원칙, 접속 로그는 운영사 정책 기간)",
    link: "https://vercel.com/legal/privacy-policy",
  },
  {
    who: "Anthropic, PBC (AI 실험 도우미 Claude)",
    country: "미국",
    items: "학생이 AI 도우미에게 쓴 질문 문장(이메일·전화번호처럼 보이는 부분은 보내기 전에 가림), 지금 실험 단계와 블록 요약. 이름·학번·학교는 보내지 않음",
    when: "학생이 AI 도우미에게 질문할 때마다 암호화된 네트워크(TLS)로 전송",
    purpose: "AI 도우미의 안내 문장 생성",
    keep: "Anthropic은 API로 받은 입력·출력을 받은 날부터 30일 안에 자동 삭제(단, 이용 정책 위반으로 판정된 대화는 최대 2년 보관될 수 있음 — Anthropic 공개 정책)",
    link: "https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data",
  },
];

function TransferCard({ t }: { t: Transfer }) {
  const rows: [string, string][] = [
    ["이전받는 자", t.who], ["이전 국가", t.country], ["이전 항목", t.items], ["이전 일시와 방법", t.when], ["이용 목적과 보유 기간", `${t.purpose} / ${t.keep}`],
  ];
  return (
    <section className="rounded-lg border border-line bg-panel p-3">
      <h3 className="font-bold">{t.who}</h3>
      <dl className="mt-1 grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="font-semibold">{k}</dt><dd>{v}</dd></div>)}</dl>
      <p className="mt-1 text-xs"><a className="underline" href={t.link} rel="noreferrer" target="_blank">운영사 개인정보 처리방침 보기</a></p>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl space-y-5 p-4 leading-relaxed">
      <h1 className="text-2xl font-bold">개인정보 처리방침</h1>
      <p role="note" className="rounded bg-amber-50 p-2 text-sm">⚠ 초안입니다. 이 서비스를 쓰는 학교의 개인정보 보호책임자가 검토한 뒤 학교 이름·연락처를 넣어 확정해 주세요.</p>
      <section aria-labelledby="p-collect" className="space-y-1">
        <h2 id="p-collect" className="text-xl font-bold">1. 모으는 정보와 이유</h2>
        <p>학생의 이름·이메일·전화번호는 받지 않아요. 선생님이 만든 반 번호(학번)와 PIN으로 로그인하고, 실험 설계·실행 기록, 예상과 계산값, AI 도우미와 나눈 대화, 탐구 보고서를 저장해요. 이 기록은 학생의 탐구 과정을 선생님이 확인하고 도와주기 위해서만 써요. 만 14세 미만 학생은 보호자 동의서를 학교가 받은 뒤에만 실험 기록을 저장할 수 있어요.</p>
      </section>
      <section aria-labelledby="p-ai" className="space-y-1">
        <h2 id="p-ai" className="text-xl font-bold">2. AI와 대화, 그리고 선생님의 열람</h2>
        <p>실험 도우미는 사람이 아닌 AI(Claude)예요. 틀린 말을 할 수 있어요. 학생이 AI와 나눈 대화, 실험 기록, 보고서는 <strong>담당 선생님이 볼 수 있어요</strong>. 걱정되는 말(예: 위험하거나 괴로운 상황)이 감지되면 선생님 화면에 확인 표시가 떠요. 다른 반 선생님과 다른 학생은 볼 수 없어요.</p>
      </section>
      <section aria-labelledby="p-transfer" className="space-y-2">
        <h2 id="p-transfer" className="text-xl font-bold">3. 개인정보의 국외 이전</h2>
        <p className="text-sm"><strong>법적 근거</strong>: 정보주체(만 14세 미만은 법정대리인)의 동의 — 「개인정보 보호법」 제28조의8 제1항 제1호. 아래 세 회사로 이전돼요.</p>
        {TRANSFERS.map((t) => <TransferCard key={t.who} t={t} />)}
        <p className="text-sm"><strong>거부 방법과 거부 시 효과</strong>: 학생·보호자는 담당 선생님(또는 학교 개인정보 보호책임자)에게 알려 국외 이전 동의를 거부하거나 철회할 수 있어요. 거부하면 계정을 만들지 않거나 지우며, 이 경우 저장되지 않는 체험 모드나 종이 활동지로 같은 실험 수업에 참여할 수 있어요.</p>
      </section>
      <section aria-labelledby="p-keep" className="space-y-1">
        <h2 id="p-keep" className="text-xl font-bold">4. 보관 기간과 삭제</h2>
        <p>선생님은 학생 한 명의 계정과 기록, 또는 반 전체 기록을 언제든 영구 삭제할 수 있어요. 학년이 끝나면 학교가 정한 기간(예: 12개월)이 지난 학생 계정과 기록을 자동으로 정리해요.</p>
      </section>
      <section aria-labelledby="p-rights" className="space-y-1">
        <h2 id="p-rights" className="text-xl font-bold">5. 권리와 문의</h2>
        <p>학생과 보호자는 기록의 열람·정정·삭제·처리 정지를 요청할 수 있어요. 문의: <strong>(학교 개인정보 보호책임자 이름·연락처를 학교가 기입)</strong></p>
      </section>
      <p className="text-sm"><Link className="underline" href="/">처음 화면으로</Link></p>
    </main>
  );
}
