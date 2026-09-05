"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { formatYen } from "@/lib/format";

export type CardChoice = {
  id: string;
  label: string;
  description: string;
  cash: number;
  satisfaction: number;
};

/**
 * 方針カード / イベントの選択 UI。
 * キーボードは 1〜3 で選択、Enter で確定。カードが切り替わったら
 * 見出しへフォーカスを移し、読み上げ順が飛ばないようにする。
 */
export function StageCard({
  eyebrow,
  title,
  description,
  choices,
  onSelect,
}: {
  eyebrow: string;
  title: string;
  description: string;
  choices: CardChoice[];
  onSelect: (choiceId: string) => void;
}) {
  const [selected, setSelected] = useState(0);
  const headingRef = useRef<HTMLParagraphElement>(null);

  // カードが変わるたびに選択位置を戻し、見出しへフォーカスを移す。
  useEffect(() => {
    setSelected(0);
    headingRef.current?.focus();
  }, [title, description]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= String(Math.min(9, choices.length))) {
        setSelected(Number(e.key) - 1);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        const target = document.activeElement;
        // ボタンにフォーカスがあるときはブラウザ既定の click に任せる。
        if (target instanceof HTMLButtonElement) return;
        onSelect(choices[selected].id);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [choices, selected, onSelect]);

  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <Panel eyebrow={eyebrow} title={title}>
      <p
        ref={headingRef}
        tabIndex={-1}
        className="text-sm leading-relaxed text-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {description}
      </p>

      <ul className="mt-4 space-y-2">
        {choices.map((choice, i) => (
          <li key={choice.id}>
            <button
              type="button"
              onClick={() => onSelect(choice.id)}
              onFocus={() => setSelected(i)}
              aria-current={selected === i ? "true" : undefined}
              className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                selected === i
                  ? "border-brand bg-brand-50/60"
                  : "border-line bg-paper/40 hover:border-ink-mute"
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span className="font-display text-xs font-bold text-ink-mute">
                  {i + 1}
                </span>
                <span className="text-sm font-bold text-ink">{choice.label}</span>
                {selected === i && (
                  <span className="text-[10px] text-brand-700">▸ 選択中</span>
                )}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                {choice.description}
              </span>
              <span className="mt-1.5 block text-[11px] text-ink-mute">
                お金 {formatYen(choice.cash)} ／ 満足度 {sign(choice.satisfaction)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-ink-mute">
          キーボードの 1〜{choices.length} で選び、Enter で決められます。
        </p>
        <Button variant="primary" onClick={() => onSelect(choices[selected].id)}>
          これで決める
        </Button>
      </div>
    </Panel>
  );
}
