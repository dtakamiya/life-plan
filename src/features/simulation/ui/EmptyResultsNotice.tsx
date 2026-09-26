/**
 * lp-019 / QA#1: `results` が空のときに SummaryCards/ResultTable/各チャートの
 * 代わりに表示する共通メッセージ。例外は投げず、呼び出し側が
 * `results.length === 0` を判定して差し替える戻り値ベースの表現とする。
 */
export function EmptyResultsNotice() {
  return (
    <div className="flex h-40 items-center justify-center rounded-2xl border border-line bg-surface p-6 text-center text-sm text-ink-mute">
      表示できる結果がありません。シミュレーション期間や入力内容をご確認ください。
    </div>
  );
}
