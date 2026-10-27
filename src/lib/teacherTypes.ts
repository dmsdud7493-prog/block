/** 교사 화면 공용 타입 (클라이언트 허용) */
export interface ClassSummary { id: string; name: string; joinCode: string; studentCount: number; settings: Record<string, unknown> }
export interface StudentRow { id: string; studentNo: string; consentOnFile: boolean; consentDate: string | null }
export interface AssignmentRow { id: string; slug: string; title: string; dueAt: string | null; allowLate: boolean }
