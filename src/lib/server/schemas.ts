/** 요청 검증 스키마 (zod) — 클라이언트가 보낸 블록 프로그램은 신뢰하지 않고 형태를 강제한다 */
import { z } from "zod";
import { tutorContextSchema } from "@/lib/tutor/stateInjection";
import { reportContentSchema } from "@/lib/report/template";
import { CLIENT_EVENTS } from "@/lib/events/types";

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

const uuid = z.string().uuid();

export const startSchema = z.object({ assignmentId: uuid });
export const saveProgramSchema = z.object({
  sessionId: uuid,
  program: programSchema,
  blockly: z.record(z.string(), z.unknown()).nullable(),
  inquiry: z.object({ problem: z.string().max(300), hypothesis: z.string().max(300) }).optional(),
});
export const runSchema = z.object({ sessionId: uuid, program: programSchema });
export const checkSchema = z.object({ sessionId: uuid, runNo: z.number().int().min(1), key: z.string().max(80), value: z.number(), unit: z.string().max(20) });
export const predictSchema = z.object({
  sessionId: uuid,
  runNo: z.number().int().min(1).nullable(),
  target: z.string().max(40),
  choice: z.string().max(40),
  rationale: z.string().min(5).max(500),
  hintsUsed: z.number().int().min(0).max(3),
  matched: z.boolean().nullable().optional(),
  rationaleAfter: z.string().max(500).optional(),
  sketch: z.array(z.number().finite().min(-50).max(400).nullable()).min(2).max(12).optional(),
});
/** 학생 브라우저가 보낼 수 있는 이벤트만 (제출·반환·플래그는 서버 함수가 남긴다 — DB에서도 같은 목록으로 거른다) */
export const eventsSchema = z.object({
  sessionId: uuid,
  events: z.array(z.object({ type: z.enum(CLIENT_EVENTS), payload: z.record(z.string(), z.unknown()).refine((p) => JSON.stringify(p).length <= 2048) })).max(50),
});

export const classCreateSchema = z.object({ name: z.string().trim().min(1).max(60) });
export const studentsSchema = z.object({ classId: uuid, studentNos: z.array(z.string().trim().min(1).max(20)).min(1).max(60) });
export const consentSchema = z.object({ studentId: uuid, onFile: z.boolean(), date: z.string().date().nullable().optional() });
export const pinSchema = z.object({ studentId: uuid });
export const classIdSchema = z.object({ classId: uuid });
export const assignSchema = z.object({
  classId: uuid,
  slug: slugSchema,
  dueAt: z.string().datetime({ offset: true }).nullable(),
  allowLate: z.boolean(),
  settings: z.record(z.string(), z.unknown()).optional(),
});
export const classSettingsSchema = z.object({
  classId: uuid,
  settings: z.object({
    hint_level_editing: z.enum(["none", "slots", "all"]).optional(),
    tone: z.enum(["haeyo", "banmal"]).optional(),
    max_runs: z.number().int().min(1).max(100).nullable().optional(),
    rationale_gate: z.boolean().optional(),
  }),
});

const level = z.enum(["high", "mid", "low"]);
export const rubricSchema = z.object({
  hypothesis_variables: level.optional(),
  data: level.optional(),
  interpretation: level.optional(),
  reflection: level.optional(),
});
export const gradeSchema = z.object({
  submissionId: uuid,
  action: z.enum(["draft", "return"]),
  rubric: rubricSchema,
  feedback: z.string().max(2000),
  reason: z.string().max(200).optional(),
});
export const assignmentUpdateSchema = z.object({
  assignmentId: uuid,
  dueAt: z.string().datetime({ offset: true }).nullable(),
  allowLate: z.boolean(),
});

export const tutorSchema = z.object({
  mode: z.enum(["demo", "session"]),
  slug: slugSchema,
  sessionId: uuid.optional(),
  seed: z.string().min(4).max(80).optional(),
  runNo: z.number().int().min(1).nullable(),
  program: programSchema,
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(1000) })).min(1).max(30),
  context: tutorContextSchema,
  nudge: z.boolean().optional(),
});
export type TutorInput = z.infer<typeof tutorSchema>;

export const reportDraftSchema = z.object({
  sessionId: uuid,
  content: reportContentSchema,
  aiAssisted: z.array(z.string().max(30)).max(12),
});
