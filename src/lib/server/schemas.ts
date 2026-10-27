/** 요청 검증 스키마 (zod) — 클라이언트가 보낸 블록 프로그램은 신뢰하지 않고 형태를 강제한다 */
import { z } from "zod";

const slot = z.union([
  z.object({ kind: z.literal("equip"), id: z.string().max(40) }),
  z.object({ kind: z.literal("quant"), value: z.number().finite().min(0).max(100000), unit: z.enum(["g", "mL", "cm", "s", "min", "°C", "개"]) }),
  z.object({ kind: z.literal("pos"), id: z.string().max(40) }),
]).nullable();

export const programSchema = z.object({
  experiment: z.string().max(30),
  steps: z.array(z.object({ blockId: z.string().max(64), action: z.string().max(20), slots: z.array(slot).max(6) })).max(200),
  variables: z.array(z.object({
    blockId: z.string().max(64),
    role: z.enum(["independent", "dependent", "controlled", "experimental_group", "comparison_group", "method"]),
    optionId: z.string().max(40).nullable(),
    rationale: z.string().max(300).optional(),
  })).max(20),
});

export const slugSchema = z.enum(["density", "melting", "boiling", "solubility", "separation1", "separation2"]);

export const predictionSchema = z.object({
  target: z.string().max(40),
  choice: z.string().max(40),
  rationale: z.string().max(500),
});

export const demoRunSchema = z.object({
  slug: slugSchema,
  seed: z.string().min(4).max(80),
  runNo: z.number().int().min(1).max(500),
  program: programSchema,
  predictions: z.array(predictionSchema).max(10),
});

export const demoCheckSchema = demoRunSchema.omit({ predictions: true }).extend({
  key: z.string().max(80),
  value: z.number(),
  unit: z.string().max(20).optional(),
});

export type DemoRunInput = z.infer<typeof demoRunSchema>;
