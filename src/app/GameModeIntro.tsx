import Link from "next/link";
import { Panel } from "@/shared/ui";

/** メイン画面からゲームモード（/game）へ誘導する案内パネル。 */
export function GameModeIntro() {
  return (
    <Panel eyebrow="Game mode" title="人生の選択を進めてみる">
      <p className="text-sm leading-relaxed text-ink-soft">
        10 年ごとの節目に方針を選びながら、このプランがどう動くかを追う
        モードです。10〜15 分で 1 回分の人生を通せます。ここでの選択は
        上の入力・グラフ・年次明細を書き換えません。
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
        イベントはゲーム上の演出です。あなたに起こる確率の予測ではありません。
      </p>
      <div className="mt-4">
        <Link
          href="/game"
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-px hover:bg-brand-700 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 focus-visible:ring-offset-paper"
        >
          人生の選択をはじめる
        </Link>
      </div>
    </Panel>
  );
}
