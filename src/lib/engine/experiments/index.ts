/** 실험 카탈로그 레지스트리 — 클라이언트 허용 (물성·정답 없음) */
import type { AnyCatalog } from "./types";
import { densityCatalog } from "./density/catalog";
import { meltingCatalog } from "./melting/catalog";
import { boilingCatalog } from "./boiling/catalog";
import { solubilityCatalog } from "./solubility/catalog";
import { separation1Catalog } from "./separation1/catalog";
import { separation2Catalog } from "./separation2/catalog";

export const CATALOGS: Record<string, AnyCatalog> = {
  density: densityCatalog,
  melting: meltingCatalog,
  boiling: boilingCatalog,
  solubility: solubilityCatalog,
  separation1: separation1Catalog,
  separation2: separation2Catalog,
};

export const EXPERIMENT_ORDER = ["density", "melting", "boiling", "solubility", "separation1", "separation2"] as const;

export function getCatalog(slug: string): AnyCatalog | null {
  return CATALOGS[slug] ?? null;
}
