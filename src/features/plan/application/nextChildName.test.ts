import { describe, expect, it } from "vitest";
import { nextChildName } from "./nextChildName";

/** テスト用に、名前だけを持つ子の配列を作る。 */
function children(...names: string[]) {
  return names.map((name, i) => ({ id: `child-${i}`, name }));
}

describe("nextChildName", () => {
  it("子が1人もいなければ「子1」を返す", () => {
    expect(nextChildName([])).toBe("子1");
  });

  it("「子1」が使われていれば「子2」を返す", () => {
    expect(nextChildName(children("子1"))).toBe("子2");
  });

  it("連続する番号が埋まっていれば次の番号を返す", () => {
    expect(nextChildName(children("子1", "子2", "子3"))).toBe("子4");
  });

  it("途中の番号が空いていればその空き番号を埋める", () => {
    expect(nextChildName(children("子1", "子3"))).toBe("子2");
  });

  it("番号の並び順が昇順でなくても空き番号を正しく見つける", () => {
    expect(nextChildName(children("子3", "子1"))).toBe("子2");
  });

  it("ユーザーが自由に付けた名前は番号の計算に影響しない", () => {
    expect(nextChildName(children("太郎", "花子"))).toBe("子1");
  });

  it("番号なしの「子」は「子N」形式ではないため番号を消費しない", () => {
    expect(nextChildName(children("子"))).toBe("子1");
  });

  it("「子01」のような前置ゼロ付きや「子1号」は対象外として扱う", () => {
    expect(nextChildName(children("子01", "子1号"))).toBe("子1");
  });
});
