import type { PlanInput } from "@/features/plan/domain";

/** スナップショットの由来（"game" はゲームモードの進行から保存されたもの）。 */
export type SnapshotOrigin = "manual" | "game";

/** 名前付きで保存した計画のスナップショット（比較用）。 */
export type Snapshot = {
  id: string;
  name: string;
  input: PlanInput;
  origin: SnapshotOrigin;
};
