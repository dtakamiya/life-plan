import type { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";

/**
 * テーマ統一のパネル（カード）。
 * eyebrow（ゴールドの細線つき小ラベル）+ title + 右肩の action を持てる。
 */
export function Panel({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-5 shadow-panel transition-shadow duration-200 hover:shadow-panel-lift ${className}`}
    >
      {(title || action || eyebrow) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow && <Eyebrow className="mb-1.5 flex">{eyebrow}</Eyebrow>}
            {title && (
              <h2 className="text-[15px] font-bold tracking-tight text-ink">
                {title}
              </h2>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
