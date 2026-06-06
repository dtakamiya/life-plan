import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
