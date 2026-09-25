/**
 * プランの JSON 書き出し/読み込み（lp-033）。
 *
 * ファイル形式は `{ format, version, input }` の封筒。`version` は形式の版で、
 * 将来の形式変更時に旧版を移行できるよう明示する。読み込みは例外を投げず
 * 戻り値で結果を返す純関数（DOM・ストアには触れない）。
 *
 * 検証は二段:
 *  1. 永続化スキーマ（planInputSchema）— 旧 v1 データ（initialAssets 等）を既存の
 *     移行で現行形へ通す。
 *  2. 入力検証スキーマ（validatePlanInput）— 範囲・有限性。巨大数値などを弾く。
 * どちらかに失敗したら読み込みは中止され、呼び出し側は現在のプランを変更しない。
 */

import { planInputSchema, validatePlanInput } from "@/features/plan/application";
import type { PlanInput } from "@/features/plan/domain";

export const PLAN_FILE_FORMAT = "life-plan";
/** 現在のファイル形式の版。 */
export const PLAN_FILE_VERSION = 1;
/** 読み込みを許すファイルサイズの上限（バイト）。プランは通常 数 KB。 */
export const PLAN_FILE_MAX_BYTES = 1024 * 1024;

export type PlanFile = {
  format: typeof PLAN_FILE_FORMAT;
  version: number;
  input: PlanInput;
};

export type ParsePlanFileResult =
  | { ok: true; input: PlanInput }
  | { ok: false; error: string };

/** 現在の入力を JSON 文字列へ書き出す。 */
export function serializePlan(input: PlanInput): string {
  const file: PlanFile = {
    format: PLAN_FILE_FORMAT,
    version: PLAN_FILE_VERSION,
    input,
  };
  return JSON.stringify(file, null, 2);
}

/** 書き出し時の既定ファイル名（例: life-plan-2026-09-25.json）。 */
export function planFileName(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `life-plan-${y}-${m}-${d}.json`;
}

const fail = (error: string): ParsePlanFileResult => ({ ok: false, error });

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** JSON テキストをプランとして読み込む。失敗時は日本語のエラー文を返す。 */
export function parsePlanFile(text: string): ParsePlanFileResult {
  if (text.trim() === "") return fail("ファイルが空です。書き出したプランの JSON ファイルを選んでください。");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail("JSON として読み取れませんでした。ファイルが壊れているか、別の形式のファイルです。");
  }
  if (!isRecord(json)) {
    return fail("プランのファイル形式ではありません。");
  }

  let rawInput: unknown;
  if ("format" in json || "version" in json) {
    if (json.format !== PLAN_FILE_FORMAT) {
      return fail("このアプリで書き出したプランのファイルではありません。");
    }
    if (typeof json.version !== "number" || !Number.isInteger(json.version) || json.version < 1) {
      return fail("ファイルのバージョン番号が不正です。");
    }
    if (json.version > PLAN_FILE_VERSION) {
      return fail(
        `新しいバージョン（v${json.version}）のファイルのため読み込めません。アプリを更新してください。`,
      );
    }
    rawInput = json.input;
  } else {
    // 封筒なしの旧形式（PlanInput をそのまま保存したもの）も v1 として受け付ける。
    rawInput = json;
  }

  // 既存の移行（v1 → 現行）を通す。
  const migrated = planInputSchema.safeParse(rawInput);
  if (!migrated.success) {
    const issue = migrated.error.issues[0];
    const where = issue && issue.path.length > 0 ? `（${issue.path.join(".")}）` : "";
    return fail(`プランのデータが正しくありません${where}。必須項目の欠落または型の誤りがあります。`);
  }

  const validation = validatePlanInput(migrated.data);
  if (!validation.ok) {
    const [path, message] = Object.entries(validation.errors)[0];
    return fail(`${message}（${path}）`);
  }
  return { ok: true, input: migrated.data };
}
