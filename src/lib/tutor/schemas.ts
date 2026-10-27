/** 튜터 구조화 출력 (ADR-P05) — hint_level은 enum (structured outputs는 minimum/maximum 미지원) */
import { z } from "zod";

export const NEXT_ACTIONS = ["ask_rationale", "edit_block", "predict", "run", "enter_calc", "write_section", "none"] as const;

export const tutorReplySchema = z.object({
  reply: z.string().max(1200),
  hint_level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  next_action: z.enum(NEXT_ACTIONS),
  target_ref: z.string().max(80),
  flag_teacher: z.boolean(),
});

export type TutorReply = z.infer<typeof tutorReplySchema>;

export interface TutorResponse extends TutorReply {
  source: "claude" | "local";
  flagged: boolean;
}
