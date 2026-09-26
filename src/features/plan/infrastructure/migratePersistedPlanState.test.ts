import { describe, it, expect } from "vitest";
import { defaultPlanInput } from "@/features/plan/domain";
import {
  SCENARIOS_STORAGE_KEY,
  SCENARIOS_STORAGE_VERSION,
  migratePersistedPlanState,
} from "./migratePersistedPlanState";

/** 移行先キーの読み書きを記録するインメモリのストレージ。 */
function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

const rawSnapshots = [
  { id: "snap-1", name: "A", input: defaultPlanInput, origin: "manual" },
  // 要素の検証は scenario ストアの merge が行うため、壊れた要素もそのまま移す
  { id: 1, broken: true },
];

const legacyState = () => ({
  input: defaultPlanInput,
  snapshots: rawSnapshots,
  rangeAutoCorrected: false,
});

describe("migratePersistedPlanState（life-plan/v1 の version 1 → 2）", () => {
  it("旧 snapshots があり新キーが無ければ、生の配列を scenario の persist 形式で新キーへ書き出す", () => {
    const storage = memoryStorage();
    migratePersistedPlanState(legacyState(), storage);
    expect(SCENARIOS_STORAGE_KEY).toBe("life-plan/scenarios/v1");
    expect(JSON.parse(storage.items.get(SCENARIOS_STORAGE_KEY) ?? "null")).toEqual({
      state: { snapshots: rawSnapshots },
      version: SCENARIOS_STORAGE_VERSION,
    });
  });

  it("snapshots だけを取り除き、input と rangeAutoCorrected はそのまま返す（引数は書き換えない）", () => {
    const persisted = legacyState();
    const migrated = migratePersistedPlanState(persisted, memoryStorage());
    expect(migrated).toEqual({ input: defaultPlanInput, rangeAutoCorrected: false });
    expect(persisted.snapshots).toBe(rawSnapshots);
  });

  it("新キーが既にあれば上書きしない", () => {
    const existing = JSON.stringify({ state: { snapshots: [] }, version: 1 });
    const storage = memoryStorage({ [SCENARIOS_STORAGE_KEY]: existing });
    const migrated = migratePersistedPlanState(legacyState(), storage);
    expect(storage.items.get(SCENARIOS_STORAGE_KEY)).toBe(existing);
    expect(migrated).not.toHaveProperty("snapshots");
  });

  it("snapshots が配列でなければ新キーへ何も書かない", () => {
    for (const snapshots of [undefined, null, "x", { a: 1 }]) {
      const storage = memoryStorage();
      const migrated = migratePersistedPlanState({ input: defaultPlanInput, snapshots }, storage);
      expect(storage.items.has(SCENARIOS_STORAGE_KEY)).toBe(false);
      expect(migrated).toEqual({ input: defaultPlanInput });
    }
  });

  it("旧データが壊れていれば新キーへ何も書かず、例外も出さない", () => {
    for (const persisted of [undefined, null, "broken", 42]) {
      const storage = memoryStorage();
      expect(migratePersistedPlanState(persisted, storage)).toBe(persisted);
      expect(storage.items.has(SCENARIOS_STORAGE_KEY)).toBe(false);
    }
  });

  it("2 回実行しても結果が同じ（冪等）", () => {
    const storage = memoryStorage();
    const first = migratePersistedPlanState(legacyState(), storage);
    const written = storage.items.get(SCENARIOS_STORAGE_KEY);
    const second = migratePersistedPlanState(legacyState(), storage);
    expect(second).toEqual(first);
    expect(storage.items.get(SCENARIOS_STORAGE_KEY)).toBe(written);
    // 移行後の状態（snapshots なし）をもう一度通しても変わらない
    expect(migratePersistedPlanState(first, storage)).toEqual(first);
  });
});
