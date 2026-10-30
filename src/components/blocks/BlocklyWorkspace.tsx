"use client";
/**
 * Blockly 13 자체 래퍼 (react-blockly 미사용 — plan D2).
 * - 작업 공간 변경(UI 이벤트 제외) → 200ms 디바운스 → Program 계산 → onProgramChange (지침 1.3)
 * - diagnostics → 블록 경고 아이콘(setWarningText) + 빨간 테두리 클래스 (지침 2.3)
 * - activeBlockId → 재생 중인 블록 강조, errorBlockId → 실행 오류 블록 깜빡임
 * 자동 완성 기능은 두지 않는다 (지침 2.4).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as Blockly from "blockly/core";
import * as Ko from "blockly/msg/ko";
import { getCatalog } from "@/lib/engine/experiments";
import type { Diagnostic, Program } from "@/lib/engine/types";
import { allBlockJson, T, toolbox } from "@/lib/blocks/blockTypes";
import { workspaceToProgram } from "@/lib/blocks/program";
import { labTheme } from "./theme";
import { registerAutoWrap, relayoutWorkspace } from "@/lib/blocks/autoWrap";
import BlockToolbar, { selectedIn } from "./BlockToolbar";

const defined = new Set<string>();

function ensureBlocks(slug: string) {
  const catalog = getCatalog(slug);
  // 끼우기 쉽게: 블록을 빈칸 근처(기본 28 → 56)에만 놓아도 쏙 들어가게
  Blockly.config.snapRadius = 56;
  Blockly.config.connectingSnapRadius = 72;
  if (!catalog || defined.has(slug)) return;
  registerAutoWrap();
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
  /** 누른 블록 id와, 그 블록이 들어 있는 행동(문장) 블록 id — 빈칸 속 준비물을 눌러도 그 행동을 찾는다 */
  onBlockClick?: (blockId: string, stepId: string) => void;
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

const FLYOUT_RATIO = 0.85;

/**
 * 블록 꾸러미: 처음엔 첫 카테고리를 펼쳐 두고, 블록을 끌어 놓아도 닫히지 않게(autoClose=false).
 * 펼친 카테고리 단추를 한 번 더 누르면 꾸러미가 닫혀 조립판을 넓게 쓴다(Blockly 기본 토글).
 */
function setupPalette(ws: Blockly.WorkspaceSvg) {
  const tb = ws.getToolbox() as Blockly.Toolbox | null;
  if (!tb) return;
  const flyout = tb.getFlyout() as (Blockly.IFlyout & { getFlyoutScale?: () => number }) | null;
  if (flyout) {
    flyout.autoClose = false;
    // 블록 꾸러미는 작게(작업판 배율의 85%) — 긴 문장형 행동 블록이 조립 화면을 덮지 않게
    flyout.getFlyoutScale = () => ws.scale * FLYOUT_RATIO;
  }
  tb.selectItemByPosition(0);
  // 꾸러미가 열리고 닫힐 때 조립판 크기를 다시 계산한다
  // 꾸러미가 닫히면 남는 스크롤 막대를 숨기고(palette-closed), 조립판 크기를 다시 계산한다
  ws.addChangeListener((e: Blockly.Events.Abstract) => {
    if (e.type !== Blockly.Events.TOOLBOX_ITEM_SELECT) return;
    ws.getParentSvg().parentElement?.classList.toggle("palette-closed", !(e as Blockly.Events.ToolboxItemSelect).newItem);
    requestAnimationFrame(() => Blockly.svgResize(ws));
  });
}

/** 빈칸 속 값 블록이면 그것을 품은 행동(문장) 블록 id를 찾는다 */
function stepOf(ws: Blockly.WorkspaceSvg, id: string): string {
  const b = ws.getBlockById(id);
  const parent = b?.outputConnection ? b.getParent() : null;
  return parent ? stepOf(ws, parent.id) : id;
}

/** E2E 전용: NEXT_PUBLIC_E2E=1 빌드에서만 작업 공간 불러오기 훅을 연다 */
function exposeForE2E(ws: Blockly.WorkspaceSvg) {
  if (process.env.NEXT_PUBLIC_E2E !== "1") return;
  const w = window as unknown as { __labLoad?: (state: object) => void; __labSlot?: (blockId: string, input: string) => { x: number; y: number } | null; __labSave?: () => object };
  w.__labLoad = (state: object) => Blockly.serialization.workspaces.load(state, ws);
  w.__labSave = () => Blockly.serialization.workspaces.save(ws);
  // 빈칸(값 입력) 연결점의 화면 좌표 — 끌어 넣기 E2E가 정확한 자리에 놓을 수 있게
  w.__labSlot = (blockId: string, input: string) => {
    const c = ws.getBlockById(blockId)?.getInput(input)?.connection as Blockly.RenderedConnection | null | undefined;
    if (!c) return null;
    const p = Blockly.utils.svgMath.wsToScreenCoordinates(ws, new Blockly.utils.Coordinate(c.x, c.y));
    return { x: p.x, y: p.y };
  };
}

function injectOptions(catalog: NonNullable<ReturnType<typeof getCatalog>>, readOnly: boolean): Blockly.BlocklyOptions {
  return {
    toolbox: readOnly ? undefined : toolbox(catalog),
    readOnly,
    renderer: "zelos",
    theme: labTheme,
    trashcan: !readOnly,
    zoom: { controls: true, wheel: false, startScale: 0.8, maxScale: 1.6, minScale: 0.5 },
    move: { scrollbars: true, drag: true, wheel: true },
    grid: { spacing: 20, length: 1, colour: "#c9ced6", snap: true },
    sounds: false,
    // 학교 망에서 외부 CDN이 막혀도 아이콘이 보이도록 자체 호스팅 (R13)
    media: "/blockly-media/",
  };
}

export default function BlocklyWorkspace(props: BlocklyWorkspaceProps) {
  const { slug, initialState, readOnly } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const cbRef = useRef(props.onProgramChange);
  const clickRef = useRef(props.onBlockClick);
  const [wsState, setWsState] = useState<Blockly.WorkspaceSvg | null>(null);
  // 조립판에서 블록을 누르거나 키를 누를 때마다 "고른 블록"을 다시 읽는다(도구 막대 단추·꾸러미 누름은 제외)
  const [selId, setSelIdState] = useState<string | null>(null);
  const selRef = useRef<string | null>(null);
  const [msg, setMsg] = useState("");
  const setSelId = useCallback((id: string | null) => {
    selRef.current = id;
    setSelIdState(id);
  }, []);
  useEffect(() => {
    // Blockly가 포인터 이벤트 전파를 멈추므로 문서 단계(capture)에서 듣는다. 고른 블록 표시(.blocklySelected)를 읽는다
    const read = (e: Event) => {
      const host = hostRef.current;
      if (!host || !(e.target instanceof Element) || !host.contains(e.target) || e.target.closest(".blocklyFlyout, .blocklyToolbox")) return;
      setTimeout(() => {
        const id = selectedIn(wsRef.current)?.id ?? host.querySelector("svg.blocklySvg .blocklySelected")?.getAttribute("data-id") ?? null;
        if (id !== selRef.current) setMsg("");
        setSelId(id);
      }, 0);
    };
    document.addEventListener("pointerup", read, true);
    document.addEventListener("keyup", read, true);
    return () => {
      document.removeEventListener("pointerup", read, true);
      document.removeEventListener("keyup", read, true);
    };
  }, [setSelId]);

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
    const ws = Blockly.inject(host, injectOptions(catalog, Boolean(readOnly)));
    Blockly.serialization.workspaces.load(initialState ?? EMPTY_WORKSPACE, ws);
    wsRef.current = ws;
    setWsState(ws);
    relayoutWorkspace(ws);
    if (!readOnly) {
      setupPalette(ws);
    }
    exposeForE2E(ws);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const emit = () => cbRef.current(workspaceToProgram(ws, slug), Blockly.serialization.workspaces.save(ws));
    ws.addChangeListener((e: Blockly.Events.Abstract) => {
      if (e.type === Blockly.Events.CLICK) {
        const id = (e as Blockly.Events.Click).blockId;
        if (id) clickRef.current?.(id, stepOf(ws, id));
      }
      if (e.isUiEvent) return;
      // 빈칸에 블록을 끼우거나 빼면 행동 블록 줄바꿈을 다시 정한다
      requestAnimationFrame(() => relayoutWorkspace(ws));
      if (timer) clearTimeout(timer);
      timer = setTimeout(emit, 200);
    });
    emit();
    // 화면 칸 크기가 바뀌면(창 크기·결과 영역 열림) 작업 공간도 다시 맞춘다
    const resize = new ResizeObserver(() => Blockly.svgResize(ws));
    resize.observe(host);
    return () => {
      resize.disconnect();
      if (timer) clearTimeout(timer);
      ws.dispose();
      wsRef.current = null;
      setWsState(null);
    };
  }, [slug, initialState, readOnly, setSelId]);

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
    <div className="absolute inset-0 flex flex-col">
      {readOnly ? null : <BlockToolbar ws={wsState} selId={selId} onSelect={setSelId} msg={msg} setMsg={setMsg} />}
      <div className="relative min-h-[380px] flex-1">
        <div ref={hostRef} className="absolute inset-0" role="application" aria-label="블록 실험 설계 작업 공간. 키보드로 블록을 고르고 옮길 수 있어요." />
      </div>
    </div>
  );
}
