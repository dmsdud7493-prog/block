"use client";
/**
 * 조립판 도구 막대 (원래 프로토타입의 📋 복사 · 📥 붙여넣기) — 블록을 누른 뒤 버튼을 눌러요.
 * - 🗑 삭제: 고른 블록을 지운다 — 잘못 끼운 준비물 블록 등(행동 블록을 지우면 아래 블록은 위로 이어 붙는다)
 * - 📋 복사 / 📋 아래까지 복사: 같은 과정을 되풀이할 때 이미 만든 블록을 복사
 * - 📥 붙여넣기: 고른 행동 블록 바로 아래에 끼워 넣는다(준비물 블록은 고른 행동 블록의 빈칸에)
 */
import { useRef, useState } from "react";
import * as Blockly from "blockly/core";
import { isNested, removeNested } from "./slotTools";

type Clip = { state: Blockly.serialization.blocks.State; chain: boolean } | null;

const lastOf = (b: Blockly.Block): Blockly.Block => (b.getNextBlock() ? lastOf(b.getNextBlock()!) : b);

/** 붙여넣은 행동 블록은 고른 블록 바로 아래에 잇는다. 준비물·수치 블록은 빈칸에 저절로 넣지 않고 옆에 두어 학생이 끌어 넣게 한다 */
function attach(pasted: Blockly.BlockSvg, target: Blockly.BlockSvg | null) {
  if (target?.nextConnection && pasted.previousConnection) {
    const after = target.nextConnection.targetBlock();
    if (after) after.unplug(false);
    target.nextConnection.connect(pasted.previousConnection);
    const tail = lastOf(pasted);
    if (after && tail.nextConnection && after.previousConnection) tail.nextConnection.connect(after.previousConnection);
    return;
  }
  const at = target?.getRelativeToSurfaceXY() ?? new Blockly.utils.Coordinate(40, 40);
  pasted.moveBy(at.x + 24, at.y + 24);
}

/** 지금 고른 블록 — Blockly 13은 고르기를 포커스로 관리한다. 도구 막대 단추를 누르면 포커스가 옮겨 가므로, 조립판에서 마지막으로 고른 블록을 쓴다 */
export function selectedIn(ws: Blockly.WorkspaceSvg | null): Blockly.BlockSvg | null {
  const sel = Blockly.getSelected();
  return ws && sel instanceof Blockly.BlockSvg && sel.workspace === ws ? sel : null;
}

function Btn({ onClick, disabled, children, label }: { onClick: () => void; disabled: boolean; children: React.ReactNode; label?: string }) {
  return <button type="button" className="tap btn-pill px-3 text-sm disabled:cursor-not-allowed disabled:border-[#c5ccd6] disabled:text-[#6b7785]" disabled={disabled} onClick={onClick} aria-label={label}>{children}</button>;
}

export default function BlockToolbar({ ws, selId, onSelect, msg, setMsg }: { ws: Blockly.WorkspaceSvg | null; selId: string | null; onSelect: (id: string | null) => void; msg: string; setMsg: (m: string) => void }) {
  const sel = ws && selId ? (ws.getBlockById(selId) as Blockly.BlockSvg | null) : null;
  const clip = useRef<Clip>(null);
  const [hasClip, setHasClip] = useState(false);
  const isStatement = Boolean(sel?.previousConnection);
  const removable = Boolean(sel && sel.isDeletable());

  const copy = (chain: boolean) => {
    if (!sel) return;
    clip.current = { state: Blockly.serialization.blocks.save(sel, { addNextBlocks: chain, saveIds: false, addCoordinates: false }) as Blockly.serialization.blocks.State, chain };
    setHasClip(true);
    setMsg(chain ? "고른 블록부터 아래 블록까지 복사했어요. 붙일 자리의 블록을 누르고 붙여넣기 해요." : "복사했어요. 붙일 자리의 블록을 누르고 붙여넣기 해요.");
  };

  const paste = () => {
    if (!ws || !clip.current) return;
    Blockly.Events.setGroup(true);
    try {
      const pasted = Blockly.serialization.blocks.append(clip.current.state, ws) as Blockly.BlockSvg;
      // '아래까지 복사'한 묶음은 그 줄의 맨 끝에 이어 붙인다 — 한 세트가 끝난 뒤 다음 세트가 오도록
      attach(pasted, clip.current.chain && sel?.nextConnection ? (lastOf(sel) as Blockly.BlockSvg) : sel);
      pasted.select();
      onSelect(pasted.id);
      setMsg(clip.current.chain ? "맨 아래에 한 세트를 이어 붙였어요. 이제 빈칸 속 내용만 바꿔 보세요." : "붙여 넣었어요. 이제 빈칸 속 내용만 바꿔 보세요.");
    } finally {
      Blockly.Events.setGroup(false);
    }
  };

  const remove = () => {
    if (!sel || !removable) return;
    const parent = isNested(sel) ? sel.getParent() : null;
    if (parent) removeNested(sel);
    else sel.dispose(true, true);
    onSelect(parent?.id ?? null);
    (parent as Blockly.BlockSvg | null)?.select();
    setMsg(parent ? "빈칸의 블록을 삭제했어요. 꾸러미에서 다른 블록을 끌어 그 빈칸에 놓아 보세요." : isStatement ? "블록을 삭제했어요. 아래 블록은 위로 이어 붙었어요." : "블록을 삭제했어요.");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-white/95 px-2 py-1.5" role="toolbar" aria-label="블록 편집">
      <Btn onClick={remove} disabled={!removable}>🗑 삭제</Btn>
      <Btn onClick={() => copy(false)} disabled={!sel || !sel.isDeletable()}>📋 복사</Btn>
      <Btn onClick={() => copy(true)} disabled={!sel || !isStatement || !sel.isDeletable()} label="고른 블록부터 아래까지 복사">📋 아래까지 복사</Btn>
      <Btn onClick={paste} disabled={!hasClip}>📥 붙여넣기</Btn>
      <p className="min-w-0 flex-1 text-xs font-semibold text-muted" aria-live="polite">{msg || (sel ? (sel.outputConnection ? "빈칸 속 블록을 골랐어요. 블록 옆 ⊗를 누르면 삭제돼요. 다른 블록을 그 빈칸으로 끌어 놓아 바꿀 수도 있어요." : "행동 블록을 골랐어요. 📋 복사 → 📥 붙여넣기 하면 바로 아래에 같은 블록이 생겨요.") : "블록을 한 번 누르면 고를 수 있어요 (Ctrl+C·Ctrl+V도 돼요)")}</p>
    </div>
  );
}
