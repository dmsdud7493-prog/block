import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EXPERIMENT_ORDER, getCatalog } from "@/lib/engine/experiments";
import DemoLab from "@/components/lab/DemoLab";

export function generateStaticParams() {
  return EXPERIMENT_ORDER.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    return { title: `${getCatalog(slug)?.title ?? "실험"} 체험` };
  } catch {
    return { title: "실험 체험" };
  }
}

export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getCatalog(slug)) notFound();
  // 체험 모드 Claude 튜터 사용 여부(서버 설정) — 꺼져 있으면 "기본 도우미만" 안내 말풍선을 띄운다
  const aiTutor = process.env.DEMO_TUTOR_ENABLED === "true" && Boolean(process.env.ANTHROPIC_API_KEY);
  return <DemoLab slug={slug} aiTutor={aiTutor} />;
}
