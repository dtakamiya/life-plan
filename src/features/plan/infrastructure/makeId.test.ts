import { afterEach, describe, expect, it, vi } from "vitest";
import { makeId } from "./makeId";

describe("makeId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefix- で始まる id を返す", () => {
    expect(makeId("loan")).toMatch(/^loan-[0-9a-f-]{36}$/);
  });

  it("呼ぶたびに異なる id を返す", () => {
    expect(makeId("event")).not.toBe(makeId("event"));
  });

  it("crypto が無い環境でも prefix- で始まる id を返す", () => {
    vi.stubGlobal("crypto", undefined);
    expect(makeId("child")).toMatch(/^child-[0-9a-z]+$/);
  });
});
