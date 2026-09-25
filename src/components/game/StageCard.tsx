"use client";

import { useEffect, useRef } from "react";
import { Button, Panel } from "@/shared/ui";
import { formatYen } from "@/shared/lib";

export type CardChoice = {
  id: string;
  label: string;
  description: string;
  cash: number;
  satisfaction: number;
  /** 指定があれば「お金 ¥…」の代わりに表示する（質素の節約効果など）。 */
  cashLabel?: string;
};

/**
 * 方針カード / イベントの選択 UI。
 * 選択（プレビュー）と確定を分離する（lp-015）。カード/1〜3 キーは選択のみ、
 * 確定は「これで決める」ボタンか Enter のみ。未選択では確定できない。
 * 選択状態は親（gameFlowReducer）が持つ。カードが切り替わったら
 * 見出しへフォーカスを移し、読み上げ順が飛ばないようにする。
 */
export function StageCard({
  eyebrow,
  title,
  description,
  choices,
  selectedId,
  onSelect,
  onConfirm,
}: {
  eyebrow: string;
  title: string;
  description: string;
  choices: CardChoice[];
  selectedId: string | null;
  onSelect: (choiceId: string) => void;
  onConfirm: () => void;
}) {
  const headingRef = useRef<HTMLParagraphElement>(null);

  // カードが変わるたびに見出しへフォーカスを移す。
  useEffect(() => {
    headingRef.current?.focus();
  }, [title, description]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 入力欄での打鍵は横取りしない（将来この画面に入力欄が増えても安全）。
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        return;
      }
      if (e.key >= "1" && e.key <= String(Math.min(9, choices.length))) {
        onSelect(choices[Number(e.key) - 1].id);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        const target = document.activeElement;
        // 「これで決める」など選択カード以外のボタンにフォーカスがあるときは
        // ブラウザ既定の click に任せる。カード上の Enter は既定だと再選択に
        // なってしまうので、確定として扱う。
        if (
          target instanceof HTMLButtonElement &&
          !target.hasAttribute("data-choice-card")
        ) {
          return;
        }
        if (selectedId !== null) onConfirm();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [choices, selectedId, onSelect, onConfirm]);

  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  // 同時にマウントされる StageCard は 1 枚だけなので固定 id で問題ない。
  const titleId = "stage-card-title";

  return (
    <Panel eyebrow={eyebrow} title={title} titleId={titleId}>
      <p
        ref={headingRef}
        tabIndex={-1}
        aria-labelledby={titleId}
        className="text-sm leading-relaxed text-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {description}
      </p>

      <ul className="mt-4 space-y-2">
        {choices.map((choice, i) => {
          const isSelected = selectedId === choice.id;
          return (
          <li key={choice.id}>
            <button
              type="button"
              onClick={() => onSelect(choice.id)}
              aria-pressed={isSelected}
              data-choice-card=""
              className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                isSelected
                  ? "border-brand bg-brand-50/60"
                  : "border-line bg-paper/40 hover:border-ink-mute"
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span className="font-display text-xs font-bold text-ink-mute">
                  {i + 1}
                </span>
                <span className="text-sm font-bold text-ink">{choice.label}</span>
                {isSelected && (
                  <span className="text-[10px] text-brand-700">▸ 選択中</span>
                )}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                {choice.description}
              </span>
              <span className="mt-1.5 block text-[11px] text-ink-mute">
                {choice.cashLabel ?? `お金 ${formatYen(choice.cash)}`} ／ 満足度 {sign(choice.satisfaction)}
              </span>
            </button>
          </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-ink-mute">
          キーボードの 1〜{choices.length} で選択、Enter で確定します。
        </p>
        <Button
          variant="primary"
          disabled={selectedId === null}
          onClick={onConfirm}
        >
          これで決める
        </Button>
      </div>
    </Panel>
  );
}
