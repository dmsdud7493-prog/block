"use client";
/** T-05 제출된 보고서(스냅숏) 읽기 — 학생 보고서와 같은 활동지 모양(ADR-P20). AI 도움을 받았다고 표시한 칸은 배지로 보여 준다 (R11) */
import { reportContentSchema } from "@/lib/report/template";
import ReportForm from "@/components/report/ReportForm";

const noop = () => undefined;

export default function ReportReadOnly({ content, aiAssisted }: { content: Record<string, unknown>; aiAssisted: string[] }) {
  const parsed = reportContentSchema.safeParse(content);
  if (!parsed.success) return <p className="text-sm">보고서 형식을 읽을 수 없어요.</p>;
  return <ReportForm content={parsed.data} update={noop} readOnly onFocusSection={noop} aiFlags={aiAssisted} />;
}
