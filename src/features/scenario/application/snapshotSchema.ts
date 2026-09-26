import { z } from "zod";
import { planInputSchema } from "@/features/plan/application";

/**
 * スナップショットの由来。ゲームモードで作られたものは乱数由来の数値を含むため、
 * 恒久的に標識して本体のシナリオと区別できるようにする。
 * 既存の保存データ（origin を持たない）は "manual" として通す。
 */
export const snapshotOriginSchema = z.enum(["manual", "game"]).default("manual");

export const snapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: planInputSchema,
  origin: snapshotOriginSchema,
});
