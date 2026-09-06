import { describe, it, expect } from "vitest";
import { createRng, stageRng } from "./rng";

describe("createRng", () => {
  it("同じ seed なら同じ列を返す", () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("異なる seed なら異なる列を返す", () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).not.toEqual(seqB);
  });

  it("値域は [0, 1)", () => {
    const rand = createRng(987654321);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("seed 0 でも定数列にならない", () => {
    const rand = createRng(0);
    const seq = [rand(), rand(), rand()];
    expect(new Set(seq).size).toBe(3);
  });
});

describe("stageRng", () => {
  it("同じ seed・同じ stageIndex なら同じ列を返す", () => {
    const a = stageRng(42, 3);
    const b = stageRng(42, 3);
    expect([a(), a()]).toEqual([b(), b()]);
  });

  it("stageIndex が違えば異なる列を返す", () => {
    const a = stageRng(42, 0);
    const b = stageRng(42, 1);
    expect([a(), a()]).not.toEqual([b(), b()]);
  });
});
