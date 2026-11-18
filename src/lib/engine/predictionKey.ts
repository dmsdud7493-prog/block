/**
 * 예측 문항의 과학적으로 맞는 선택지 (server-only) — 교사 실시간 보드의 '예상 vs 결과' 칸에만 쓴다.
 * 학생 응답·화면에는 내보내지 않는다(규칙 3: 정답 데이터는 서버에만).
 */
import "server-only";

const KEY: Record<string, Record<string, string>> = {
  density: { oil_water: "oil_top", same_density: "same", float_sink: "iron_water_oil" },
  solubility: { kno3_room: "limit", more_at_room: "kno3", kno3_temp: "hot_most" },
  melting: { graph_shape: "flat_then_rise", two_mp: "different", mass_same_mp: "same" },
  boiling: { graph_while_boiling: "flat", two_bp: "lower", amount_or_heat_bp: "same" },
  separation1: { graph_shape: "flat_near_ethanol", first_collected: "ethanol" },
  separation2: { cool_result: "white_crystals", filter_split: "boric_paper_cuso4_filtrate" },
};

/** 예측이 결과와 같았는가 — 모르는 문항이면 null */
export function predictionMatched(slug: string, target: string, choice: string): boolean | null {
  const right = KEY[slug]?.[target];
  return right ? right === choice : null;
}
