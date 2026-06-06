"use client";

import { useId } from "react";
import { Panel } from "@/components/ui/Panel";

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

/** 円・整数などの数値入力。value/onChange は数値で扱う。 */
export function NumberField({
  label,
  hint,
  value,
  onChange,
  step,
  suffix,
}: BaseProps & {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <span className={labelClass}>{label}</span>
      <span className="relative flex items-center">
        <input
          id={id}
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(e.target.valueAsNumber)}
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

/** 率（小数）をパーセントで入力する。内部は小数、UI は%。 */
export function PercentField({
  label,
  hint,
  value,
  onChange,
}: BaseProps & {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <NumberField
      label={label}
      hint={hint}
      suffix="%"
      step={0.1}
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
