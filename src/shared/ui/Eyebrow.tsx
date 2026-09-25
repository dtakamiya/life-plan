import type { ReactNode } from "react";

/**
 * セクション見出しの上に置く小ラベル（ゴールドの細線 + 大文字風の小ラベル）。
 * `.eyebrow` ユーティリティ（globals.css）に、先頭のゴールド細線を添える。
 */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`eyebrow ${className}`}>
      <span className="h-px w-4 bg-gold/70" aria-hidden />
      {children}
    </span>
  );
}
