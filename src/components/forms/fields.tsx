"use client";

import { useId } from "react";

type BaseProps = {
  label: string;
  hint?: string;
};

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
      {children}
    </section>
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
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <span className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
      </span>
      {hint && <span className="mt-0.5 block text-[10px] text-slate-400">{hint}</span>}
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
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
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
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </label>
  );
}
