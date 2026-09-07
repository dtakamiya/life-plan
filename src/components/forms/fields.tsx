"use client";

import { useId, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { normalizeNumberInput } from "./number-input";

type BaseProps = {
  label: string;
  hint?: string;
};

const inputClass =
  "w-full rounded-lg border border-line bg-paper/50 px-3 py-2 text-sm text-ink shadow-[inset_0_1px_2px_rgba(23,40,59,0.04)] transition-colors placeholder:text-ink-mute focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/25";

const labelClass = "mb-1 block text-xs font-medium text-ink-soft";

export function Section({
  title,
  children,
  action,
  eyebrow,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <Panel title={title} action={action} eyebrow={eyebrow}>
      {children}
    </Panel>
  );
}

/**
 * 円・整数などの数値入力。value/onChange は数値で扱う。
 *
 * 入力ハンドリングの方針（lp-012 / QA#1）:
 * - `type="text"` + 内部 draft 文字列で扱う。全消去したときは内部状態に「空」を
 *   保持し、0 を自動補填しない。フォーカスアウト時に空なら既定値 0 へ確定する
 *   （必須項目のエラー表示は zod 層 = lp-005 の責務。ここでは寄せるだけ）。
 * - 符号可否はフィールド定義（`signed` prop）に従う。`signed` のフィールドでのみ
 *   先頭 `-` を保持し、桁を打ち進めても符号を落とさない。既定は符号なし（0 以上）。
 * - 全角数字・カンマ区切り・前後空白は number へ正規化する（normalize は
 *   `./number-input` の純関数に切り出し、単体テスト済み）。
 * - 編集中（draft !== null）は外部 value の変化を無視し、ユーザーの入力途中の
 *   文字列とキャレットを保つ。blur で draft を破棄し、以後は外部 value を表示。
 */
export function NumberField({
  label,
  hint,
  value,
  onChange,
  suffix,
  signed = false,
}: BaseProps & {
  value: number;
  onChange: (value: number) => void;
  /** 数値スピナー用の刻み。text 入力化に伴い視覚的効果はないが API 互換で残す。 */
  step?: number;
  suffix?: string;
  /** true のときだけ負値（先頭 `-`）を許可する。既定は 0 以上のみ。 */
  signed?: boolean;
}) {
  const id = useId();
  // null = 非編集（外部 value を表示） / 文字列 = 編集中の生入力
  const [draft, setDraft] = useState<string | null>(null);

  const display =
    draft !== null ? draft : Number.isFinite(value) ? String(value) : "";

  return (
    <label htmlFor={id} className="block">
      <span className={labelClass}>{label}</span>
      <span className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode={signed ? "text" : "numeric"}
          value={display}
          onChange={(e) => {
            const raw = e.target.value;
            const { text, value: next } = normalizeNumberInput(raw, { signed });
            // 生入力から不要文字だけ除いた text を draft に保持（空も保持する）
            setDraft(text);
            // 数値として確定できるときだけ親へ通知。空 / `-` のみのときは
            // 直前の確定値を維持し、0 を自動補填しない。
            if (next !== null) onChange(next);
          }}
          onBlur={() => {
            if (draft === null) return;
            const { value: next } = normalizeNumberInput(draft, { signed });
            // 空のまま確定したら既定値 0 へ寄せる
            onChange(next ?? 0);
            setDraft(null);
          }}
          className={`${inputClass} tabular-nums ${suffix ? "pr-9" : ""}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 text-xs text-ink-mute">
            {suffix}
          </span>
        )}
      </span>
      {hint && <span className="mt-1 block text-[11px] text-ink-mute">{hint}</span>}
    </label>
  );
}

/**
 * 率（小数）をパーセントで入力する。内部は小数、UI は%。
 *
 * 符号可否はフィールドごとに呼び出し側が `signed` で指定する（既定は 0 以上のみ）。
 * 率系で `signed`（負値許容）にするのは「運用損もありうる利回り」「デフレもありうる
 * 物価上昇率」の 2 つだけ。金利など 0 未満があり得ない率は既定（符号なし）のままにする。
 */
export function PercentField({
  label,
  hint,
  value,
  onChange,
  signed = false,
}: BaseProps & {
  value: number;
  onChange: (value: number) => void;
  /** true のときだけ負の率（先頭 `-`）を許可する。既定は 0 以上のみ。 */
  signed?: boolean;
}) {
  return (
    <NumberField
      label={label}
      hint={hint}
      suffix="%"
      step={0.1}
      signed={signed}
      value={Math.round(value * 1000) / 10}
      onChange={(percent) =>
        onChange(Number.isFinite(percent) ? percent / 100 : 0)
      }
    />
  );
}

/** 選択肢から1つ選ぶプルダウン。option の値は文字列。 */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: BaseProps & {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <span className={labelClass}>{label}</span>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={`${inputClass} cursor-pointer appearance-none pr-8`}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </label>
  );
}

/** テキスト入力。 */
export function TextField({
  label,
  value,
  onChange,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <span className={labelClass}>{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}
