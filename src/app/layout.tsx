import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, Zen_Old_Mincho } from "next/font/google";
import "./globals.css";

// 本文・ラベル・見出し = 端正な和文ゴシック。
const sans = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-sans",
});

// アプリ名・大きな数値 = 明朝（資産レポートの品格）。
const display = Zen_Old_Mincho({
  subsets: ["latin"],
  weight: ["500", "600", "700", "900"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "life-plan | ライフプラン・シミュレーター",
  description:
    "世帯の収入・支出・ライフイベント・資産運用条件から年次キャッシュフローと純資産推移を計算・可視化します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
