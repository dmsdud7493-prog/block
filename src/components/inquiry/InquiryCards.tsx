"use client";
/**
 * 탐구 카드 5칸 — 문제·가설·변인·절차·예상을 구분된 시각 요소로 (지침 1.1),
 * 블록·예측이 바뀌면 카드가 함께 갱신된다 (지침 1.3).
 */
import type { Program } from "@/lib/engine/types";
import type { AnyCatalog } from "@/lib/engine/experiments/types";
import type { InquiryText, PredictionRecord } from "@/components/lab/types";
import { VARIABLE_BLOCKS } from "@/lib/engine/dsl/variableBlocks";

interface Props {
  catalog: AnyCatalog;
  program: Program;
  inquiry: InquiryText;
  predictions: PredictionRecord[];
  onInquiry: (field: keyof InquiryText, value: string) => void;
  readOnly?: boolean;
}

/** 미션 카드 — 색 띠 + 이모지 + 채우면 ✅ (색만으로 구분하지 않도록 글자 "완료"도 함께) */
function Card({ title, icon, children, tone, filled }: { title: string; icon: string; children: React.ReactNode; tone: string; filled: boolean }) {
  return (
    <section className={`min-w-0 flex-1 rounded-xl border-t-4 bg-panel px-2.5 py-2 shadow-sm ${tone}`} aria-label={title}>
      <h3 className="flex items-center gap-1 text-sm font-extrabold text-ink">
        <span aria-hidden="true" className="text-base">{icon}</span>{title}
        {filled ? <span className="pop-in ml-auto rounded-full bg-[#e3f7ef] px-1.5 text-xs font-bold text-ok">✅ 완료</span> : null}
      </h3>
      {children}
    </section>
  );
}

function TextField({ label, value, onChange, placeholder, readOnly }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; readOnly?: boolean }) {
  return (
    <label className="mt-1 block text-sm">
      <span className="sr-only">{label}</span>
      <textarea className="h-12 w-full resize-none rounded-lg border border-line bg-[#fbfcfe] px-2 py-1 text-sm focus:border-brand" value={value} placeholder={placeholder} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} maxLength={300} />
    </label>
  );
}

function variableSummary(catalog: AnyCatalog, program: Program): string[] {
  return program.variables.filter((v) => v.optionId).map((v) => {
    const role = VARIABLE_BLOCKS.find((b) => b.role === v.role)?.label.split("(")[0] ?? v.role;
    const opt = catalog.variableOptions.find((o) => o.id === v.optionId)?.label ?? "";
    return `${role}: ${opt}`;
  });
}

function predictionSummary(catalog: AnyCatalog, predictions: PredictionRecord[]): string[] {
  return predictions.filter((p) => p.choice).map((p) => {
    const t = catalog.predictionTargets.find((x) => x.id === p.target);
    return t?.choices.find((c) => c.id === p.choice)?.label ?? p.choice;
  });
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="mt-1 text-sm text-muted">{empty}</p>;
  return <ul className="mt-1 list-inside list-disc text-sm">{items.map((t) => <li key={t} className="truncate">{t}</li>)}</ul>;
}

export default function InquiryCards({ catalog, program, inquiry, predictions, onInquiry, readOnly }: Props) {
  const vars = variableSummary(catalog, program);
  const preds = predictionSummary(catalog, predictions);
  const stepCount = program.steps.length;
  return (
    <div className="flex flex-col gap-2 md:grid md:grid-cols-5" aria-label="탐구 카드">
      <Card title="① 탐구 문제" icon="❓" tone="border-[#4c97ff]" filled={Boolean(inquiry.problem.trim())}>
        <TextField label="탐구 문제" value={inquiry.problem} onChange={(v) => onInquiry("problem", v)} placeholder="무엇이 궁금한가요?" readOnly={readOnly} />
      </Card>
      <Card title="② 가설" icon="💭" tone="border-[#7c3aed]" filled={Boolean(inquiry.hypothesis.trim())}>
        <TextField label="가설" value={inquiry.hypothesis} onChange={(v) => onInquiry("hypothesis", v)} placeholder="~하면 ~할 것이다. 왜냐하면 ~" readOnly={readOnly} />
      </Card>
      <Card title="③ 실험 계획" icon="🎛️" tone="border-pink" filled={vars.length > 0}>
        <List items={vars} empty="무엇을 바꿔 보고, 재고, 똑같이 맞출지 블록으로 정해요." />
      </Card>
      <Card title="④ 절차" icon="🪜" tone="border-sun" filled={stepCount > 0}>
        <p className="mt-1 text-sm">{stepCount > 0 ? `행동 블록 ${stepCount}개` : "실험 절차 아래에 블록을 이어 보세요."}</p>
      </Card>
      <Card title="⑤ 예상" icon="🔮" tone="border-mint" filled={preds.length > 0}>
        <List items={preds} empty="실행 전에 결과를 예상해요." />
      </Card>
    </div>
  );
}
