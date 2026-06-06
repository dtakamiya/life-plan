# life-plan

生涯のライフプランを計画・シミュレーションできる Web アプリ。

世帯（本人・配偶者・子）の収入・支出・ライフイベント・資産運用条件をもとに、
現在から将来までの年次キャッシュフローと純資産推移を計算し、グラフ・表で可視化する。

## 想定スタック

- Next.js (App Router) + TypeScript
- Tailwind CSS / Recharts / Zustand / React Hook Form + zod
- データ保存: ブラウザ内 localStorage（サーバー不要）

## 機能（MVP 実装済み）

- 収支キャッシュフローの年次シミュレーション（純関数エンジン `src/lib/simulation/engine.ts`）
- ライフイベント（住宅購入・退職など、単発の臨時収支）の反映
- 資産運用・インフレを考慮した資産推移
- 公的年金・所得税/住民税・社会保険料の **簡易な概算**
- 入力（世帯・支出・資産運用・イベント）は localStorage に自動保存
- 純資産推移・年次キャッシュフローのグラフと年次明細テーブル

> 税・年金・社会保険料は厳密な制度計算ではなく、大まかな概算です。

## セットアップ

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # 本番ビルド（型チェック・Lint 込み）
npm run test   # シミュレーションエンジンの単体テスト（Vitest）
```

## 構成

- `src/app/` — App Router のページ・レイアウト
- `src/lib/simulation/` — ドメイン型・シミュレーションエンジン・税/年金/社保の概算
- `src/lib/store/` — Zustand + persist による入力ストア（localStorage）
- `src/components/` — 入力フォーム・グラフ・結果テーブル
