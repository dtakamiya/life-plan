"use client";

import { useEffect, useState } from "react";
import { usePlanStore } from "./usePlanStore";

/**
 * plan ストアの localStorage からの復元（ハイドレーション）が終わったか。
 * 復元前に既定値を描画すると、保存済みの内容と食い違った状態で入力できて
 * しまい、サーバー描画ともミスマッチするため、描画の出し分けに使う。
 */
export function usePlanHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(usePlanStore.persist.hasHydrated());
    const unsub = usePlanStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}
