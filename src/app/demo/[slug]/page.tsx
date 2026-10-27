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
  return <DemoLab slug={slug} />;
}
