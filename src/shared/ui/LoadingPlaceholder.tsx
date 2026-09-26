/** localStorage 復元（ハイドレーション）待ちの共通プレースホルダー。 */
export function LoadingPlaceholder({ className }: { className: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-sm text-ink-mute ${className}`}
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
      読み込み中…
    </div>
  );
}
