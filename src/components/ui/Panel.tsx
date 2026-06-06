import type { ReactNode } from "react";

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
            {eyebrow && (
              <span className="eyebrow mb-1.5 flex">
                <span className="h-px w-4 bg-gold/70" aria-hidden />
                {eyebrow}
              </span>
            )}
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
