"use client";
/**
 * Blockly 13 자체 래퍼 (react-blockly 미사용 — plan D2).
 * - 작업 공간 변경(UI 이벤트 제외) → 200ms 디바운스 → Program 계산 → onProgramChange (지침 1.3)
 * - diagnostics → 블록 경고 아이콘(setWarningText) + 빨간 테두리 클래스 (지침 2.3)
 * - activeBlockId → 재생 중인 블록 강조, errorBlockId → 실행 오류 블록 깜빡임
 * 자동 완성 기능은 두지 않는다 (지침 2.4).
 */
import { useEffect, useRef } from "react";
import * as Blockly from "blockly/core";
import * as Ko from "blockly/msg/ko";
import { getCatalog } from "@/lib/engine/experiments";
import type { Diagnostic, Program } from "@/lib/engine/types";
import { allBlockJson, T, toolbox } from "@/lib/blocks/blockTypes";
import { workspaceToProgram } from "@/lib/blocks/program";
import { labTheme } from "./theme";

const defined = new Set<string>();

function ensureBlocks(slug: string) {
  const catalog = getCatalog(slug);
  if (!catalog || defined.has(slug)) return;
  Blockly.common.defineBlocksWithJsonArray(allBlockJson(catalog));
  defined.add(slug);
}

export const EMPTY_WORKSPACE = {
  blocks: {
    languageVersion: 0,
    blocks: [
      { type: T.designStart, x: 24, y: 24, deletable: false },
      { type: T.procStart, x: 24, y: 220, deletable: false },
    ],
  },
};

export interface BlocklyWorkspaceProps {
  slug: string;
  initialState?: object | null;
  diagnostics: Diagnostic[];
  activeBlockId?: string | null;
  errorBlockId?: string | null;
  readOnly?: boolean;
  /** 점검 패널에서 고른 블록으로 이동·선택 */
  selectBlockId?: string | null;
  onProgramChange: (program: Program, state: object) => void;
  onBlockClick?: (blockId: string) => void;
}

function applyDiagnostics(ws: Blockly.WorkspaceSvg, diags: Diagnostic[]) {
  const byBlock = new Map<string, string[]>();
  diags.forEach((d) => {
    if (d.blockId) byBlock.set(d.blockId, [...(byBlock.get(d.blockId) ?? []), d.message]);
  });
  ws.getAllBlocks(false).forEach((b) => {
    const msgs = byBlock.get(b.id);
    b.setWarningText(msgs ? msgs.join("\n") : null);
    b.getSvgRoot().classList.toggle("lab-block-warn", Boolean(msgs));
  });
}

function markBlock(ws: Blockly.WorkspaceSvg, id: string | null | undefined, cls: string) {
  ws.getAllBlocks(false).forEach((b) => b.getSvgRoot().classList.toggle(cls, b.id === id));
}

/** E2E 전용: NEXT_PUBLIC_E2E=1 빌드에서만 작업 공간 불러오기 훅을 연다 */
function exposeForE2E(ws: Blockly.WorkspaceSvg) {
  if (process.env.NEXT_PUBLIC_E2E !== "1") return;
  const w = window as unknown as { __labLoad?: (state: object) => void };
  w.__labLoad = (state: object) => Blockly.serialization.workspaces.load(state, ws);
}

export default function BlocklyWorkspace(props: BlocklyWorkspaceProps) {
  const { slug, initialState, readOnly } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const cbRef = useRef(props.onProgramChange);
  const clickRef = useRef(props.onBlockClick);

  useEffect(() => {
    cbRef.current = props.onProgramChange;
    clickRef.current = props.onBlockClick;
  }, [props.onProgramChange, props.onBlockClick]);

  useEffect(() => {
    const host = hostRef.current;
    const catalog = getCatalog(slug);
    if (!host || !catalog) return undefined;
    Blockly.setLocale(Ko as unknown as Record<string, string>);
    ensureBlocks(slug);
    const ws = Blockly.inject(host, {
      toolbox: readOnly ? undefined : toolbox(catalog),
      readOnly: Boolean(readOnly),
      renderer: "zelos",
      theme: labTheme,
      trashcan: !readOnly,
      zoom: { controls: true, wheel: false, startScale: 0.8, maxScale: 1.6, minScale: 0.5 },
      move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 24, length: 2, colour: "#e2e8f0", snap: true },
      sounds: false,
      // 학교 망에서 외부 CDN이 막혀도 아이콘이 보이도록 자체 호스팅 (R13)
      media: "/blockly-media/",
    });
    Blockly.serialization.workspaces.load(initialState ?? EMPTY_WORKSPACE, ws);
    wsRef.current = ws;
    exposeForE2E(ws);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const emit = () => cbRef.current(workspaceToProgram(ws, slug), Blockly.serialization.workspaces.save(ws));
    ws.addChangeListener((e: Blockly.Events.Abstract) => {
      if (e.type === Blockly.Events.CLICK) {
        const id = (e as Blockly.Events.Click).blockId;
        if (id) clickRef.current?.(id);
      }
      if (e.isUiEvent) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(emit, 200);
    });
    emit();
    return () => {
      if (timer) clearTimeout(timer);
      ws.dispose();
      wsRef.current = null;
    };
  }, [slug, initialState, readOnly]);

  useEffect(() => {
    if (wsRef.current) applyDiagnostics(wsRef.current, props.diagnostics);
  }, [props.diagnostics]);

  useEffect(() => {
    if (wsRef.current) markBlock(wsRef.current, props.activeBlockId, "lab-block-active");
  }, [props.activeBlockId]);

  useEffect(() => {
    if (wsRef.current) markBlock(wsRef.current, props.errorBlockId, "lab-block-error");
  }, [props.errorBlockId]);

  useEffect(() => {
    const ws = wsRef.current;
    const block = ws && props.selectBlockId ? ws.getBlockById(props.selectBlockId) : null;
    if (!ws || !block) return;
    ws.centerOnBlock(block.id);
    block.select();
  }, [props.selectBlockId]);

  return (
    <div
      ref={hostRef}
      className="h-full min-h-[420px] w-full"
      role="application"
      aria-label="블록 실험 설계 작업 공간. 키보드로 블록을 고르고 옮길 수 있어요."
    />
  );
}
