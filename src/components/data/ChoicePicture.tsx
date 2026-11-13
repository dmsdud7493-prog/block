/**
 * 예측 카드의 작은 비커 그림 — 보기 글만으로는 떠올리기 어려운 결과를 그림으로 보여 준다.
 * 보기마다 그 보기가 말하는 모습을 그대로 그릴 뿐, 맞고 틀림은 드러내지 않는다(지침 3.1, 형성평가).
 * 그림이 정해진 보기만 그리고, 없으면 카드에 글만 둔다.
 */
type Layer = "water" | "oil" | "iron" | "irons" | "mix";

/** 예측 질문 id → 보기 id → 비커 속 층(아래부터) */
const PICTURES: Record<string, Record<string, Layer[]>> = {
  float_sink: {
    iron_water_oil: ["irons", "water", "oil"],
    big_water_small: ["iron", "water", "iron", "oil"],
    oil_water_iron: ["oil", "water", "irons"],
    mixed: ["mix"],
  },
};

const LAYER_CLASS: Record<Layer, string> = {
  water: "h-[14px] bg-sky-400",
  oil: "h-[12px] bg-amber-300",
  iron: "h-[8px] bg-slate-600",
  irons: "flex h-[10px] justify-around",
  mix: "h-[36px] bg-gradient-to-r from-sky-400 via-amber-300 to-sky-400",
};

function LayerBar({ layer }: { layer: Layer }) {
  if (layer !== "irons") return <i className={`block w-full ${LAYER_CLASS[layer]}`} />;
  return (
    <i className={`w-full ${LAYER_CLASS.irons}`}>
      <b className="block h-[9px] w-[13px] rounded-sm bg-slate-600" />
      <b className="block h-[7px] w-[9px] self-end rounded-sm bg-slate-600" />
    </i>
  );
}

export const hasPicture = (targetId: string) => targetId in PICTURES;

export default function ChoicePicture({ targetId, choiceId }: { targetId: string; choiceId: string }) {
  const layers = PICTURES[targetId]?.[choiceId];
  if (!layers) return null;
  return (
    <span aria-hidden="true" className="mx-auto mt-2 flex h-[54px] w-[48px] flex-col-reverse overflow-hidden rounded-b-lg border-[2.5px] border-t-0 border-white/85 bg-white/15">
      {layers.map((l, i) => <LayerBar key={`${l}-${i}`} layer={l} />)}
    </span>
  );
}
