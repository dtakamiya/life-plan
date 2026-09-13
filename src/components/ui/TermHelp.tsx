"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARY, type GlossaryTermKey } from "@/lib/glossary";
import { computePanelPosition } from "./termHelpPosition";

type PanelPosition = { top: number; left: number; width: number };

/**
 * 専門用語の横に置く「?」ボタンと解説ポップオーバー（issue #22）。
 *
 * - スマホでも使えるよう、ホバーではなくクリックで開閉する disclosure 型にする。
 * - Escape で閉じてボタンへフォーカスを戻す。パネル外の pointerdown でも閉じる
 *   （mousedown は iOS Safari で非クリッカブル要素タップ時に発火しないことが
 *   あるため pointerdown を使う）。
 * - フォームの `<label>` 内に置かれるため、ボタンのクリックは
 *   `preventDefault()` して label の既定動作（入力欄へのフォーカス移動）を
 *   止める。パネル本文のクリックも同様に止める（パネルは label の子孫）。
 * - パネルは `position: fixed` にして、ビューポート左右のガター内に収まる
 *   位置を `computePanelPosition` で計算する（スマホ幅での右端はみ出し対策）。
 * - ラッパー外へフォーカスが移ったとき、開閉状態にかかわらずパネルを閉じる。
 */
export function TermHelp({ term }: { term: GlossaryTermKey }) {
  const entry = GLOSSARY[term];
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const openPanel = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition(
        computePanelPosition({
          buttonLeft: rect.left,
          buttonBottom: rect.bottom,
          viewportWidth: window.innerWidth,
        }),
      );
    }
    setOpen(true);
  };

  const closePanel = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closePanel();
      buttonRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent | Event) => {
      if (wrapperRef.current?.contains(e.target as Node)) return;
      closePanel();
    };
    const onScrollOrResize = () => {
      closePanel();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className="relative ml-1 inline-block align-middle"
      onBlur={(e) => {
        // ラッパー外（relatedTarget が null の場合を含む）へフォーカスが
        // 移ったらパネルを閉じる。ラッパー内での移動（ボタン自身のクリック
        // 等）では閉じない。
        if (wrapperRef.current?.contains(e.relatedTarget as Node)) return;
        closePanel();
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`「${entry.term}」の説明`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(e) => {
          e.preventDefault();
          if (open) {
            closePanel();
          } else {
            openPanel();
          }
        }}
        className="relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-line bg-surface text-[10px] font-semibold leading-none text-ink-soft transition-colors after:absolute after:-inset-1 after:content-[''] hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        ?
      </button>
      {open && position && (
        <span
          id={panelId}
          role="note"
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            width: position.width,
          }}
          onClick={(e) => {
            // label の子孫のため、パネル本文のクリックでも label の既定動作
            // （入力欄へのフォーカス移動）を止める。
            e.preventDefault();
          }}
          className="z-20 rounded-lg border border-line bg-surface p-3 text-left text-[11px] font-normal leading-relaxed text-ink-soft shadow-lg"
        >
          <span className="mb-1 block text-xs font-semibold text-ink">
            {entry.term}
          </span>
          {entry.description}
        </span>
      )}
    </span>
  );
}
