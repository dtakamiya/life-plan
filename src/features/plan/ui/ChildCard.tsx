"use client";

import { useId, useState } from "react";
import {
  EDUCATION_PRESETS,
  type Child,
  type SchoolType,
  type UniversityType,
} from "@/features/plan/domain";
import { Button, NumberField, SelectField, TextField } from "@/shared/ui";

const SCHOOL_OPTIONS: readonly SchoolType[] = ["公立", "私立"];
const UNIVERSITY_OPTIONS: readonly UniversityType[] = [
  "なし",
  "国公立",
  "私立文系",
  "私立理系",
];

/** 閉じた状態の子カードに出す進路の要約（例: 「幼〜高: 公立 / 大学: 国公立」）。 */
function educationSummary(education: Child["education"]): string {
  const { kindergarten, elementary, juniorHigh, highSchool, university } = education;
  const schools = [kindergarten, elementary, juniorHigh, highSchool];
  const k12 = schools.every((s) => s === kindergarten)
    ? `幼〜高: ${kindergarten}`
    : `幼: ${kindergarten}・小: ${elementary}・中: ${juniorHigh}・高: ${highSchool}`;
  return `${k12} / 大学: ${university}`;
}

/** 子1人分の入力（基本情報＋進路プラン）。 */
export function ChildCard({
  child,
  startYear,
  birthYearError,
  onChange,
  onRemove,
}: {
  child: Child;
  birthYearError?: string;
  /** 見出しの年齢表示に使うシミュレーション開始年。 */
  startYear: number;
  onChange: (patch: Partial<Child>) => void;
  onRemove: () => void;
}) {
  const { education } = child;
  // lp-021 / issue #21: 名前欄を書き換えなくてもカードを判別できるよう、
  // 名前と開始年時点の年齢を見出しに出す。GameHud と同じ「開始年 − 生年」基準。
  const age = startYear - child.birthYear;
  // 子育て共働きペルソナレビュー #7: 生まれる前の子は出産予定の年を示す。
  const heading =
    age >= 0 ? `${child.name}（${age}歳）` : `${child.name}（${child.birthYear}年生まれ予定）`;
  // 同 #12: 進路セレクト5つは開閉式にし、スマホ幅でカードが長くなりすぎないようにする。
  // どのプリセットとも一致しない（個別に選んだ）進路は、内容が見えるよう既定で開く。
  const matchesPreset = EDUCATION_PRESETS.some(
    (preset) => JSON.stringify(education) === JSON.stringify(preset.value),
  );
  const [educationOpen, setEducationOpen] = useState(!matchesPreset);
  const educationRegionId = useId();
  return (
    <div className="rounded-xl border border-line bg-paper/40 p-3">
      {/* Section の見出しは h2 なので、その下位として h3 にする */}
      <h3 className="mb-2 text-xs font-medium text-ink-soft">{heading}</h3>

      <div className="flex items-end gap-2">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <TextField
            label="名前"
            value={child.name}
            onChange={(name) => onChange({ name })}
          />
          <NumberField
            label="生年（西暦）"
            error={birthYearError}
            value={child.birthYear}
            onChange={(birthYear) => onChange({ birthYear })}
          />
        </div>
        <Button variant="danger" size="sm" onClick={onRemove} className="mb-px">
          削除
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {EDUCATION_PRESETS.map((preset) => {
          // lp-ui-ux-audit-fix / FR5.1: 現在の進路と一致するプリセットを
          // 選択中として aria-pressed + 視覚的ハイライトで示す。
          const isSelected =
            JSON.stringify(education) === JSON.stringify(preset.value);
          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange({ education: preset.value })}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                isSelected
                  ? "border-brand bg-brand-50 font-medium text-brand-700"
                  : "border-line bg-surface text-ink-soft hover:border-brand hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-soft">
        <button
          type="button"
          aria-expanded={educationOpen}
          aria-controls={educationRegionId}
          onClick={() => setEducationOpen((open) => !open)}
          className="rounded text-brand-700 underline underline-offset-2 hover:text-brand"
        >
          {educationOpen ? "進路の詳細を閉じる" : "進路を個別に選ぶ"}
        </button>
        {!educationOpen && <span>{educationSummary(education)}</span>}
      </div>

      {educationOpen && (
        <div id={educationRegionId} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SelectField
            label="幼稚園"
            value={education.kindergarten}
            options={SCHOOL_OPTIONS}
            onChange={(v) => onChange({ education: { ...education, kindergarten: v } })}
          />
          <SelectField
            label="小学校"
            value={education.elementary}
            options={SCHOOL_OPTIONS}
            onChange={(v) => onChange({ education: { ...education, elementary: v } })}
          />
          <SelectField
            label="中学校"
            value={education.juniorHigh}
            options={SCHOOL_OPTIONS}
            onChange={(v) => onChange({ education: { ...education, juniorHigh: v } })}
          />
          <SelectField
            label="高校"
            value={education.highSchool}
            options={SCHOOL_OPTIONS}
            onChange={(v) => onChange({ education: { ...education, highSchool: v } })}
          />
          <SelectField
            label="大学"
            value={education.university}
            options={UNIVERSITY_OPTIONS}
            onChange={(v) => onChange({ education: { ...education, university: v } })}
          />
        </div>
      )}
    </div>
  );
}
