# コード構造（life-plan）

## パッケージ／モジュール構成

単一 npm パッケージ（ルート唯一、サブパッケージ分割なし）。ディレクトリ構成
とレイヤー責務は次の通り（各ファイルの責務詳細は `component-inventory.md` を
参照 — ここでは重複記載しない）。

```
src/
├── app/                    # Next.js App Router（ページ・レイアウト）
│   ├── layout.tsx
│   ├── page.tsx            # メインシミュレーター画面
│   └── game/page.tsx       # 人生ゲーム画面
├── components/             # UI層
│   ├── forms/               # 入力フォーム群
│   ├── charts/               # Recharts グラフ
│   ├── game/                 # 人生ゲームUI
│   ├── ui/                   # 汎用UIプリミティブ
│   ├── AssumptionsPanel.tsx
│   ├── ResultTable.tsx
│   └── ScenarioBar.tsx
└── lib/
    ├── store/                # Zustand グローバル状態（usePlanStore, newLoan）
    ├── simulation/           # シミュレーション・ドメインロジック
    ├── game/                 # 人生ゲーム・ドメインロジック
    ├── schema.ts             # zod 永続化検証スキーマ
    ├── assumptions.ts
    └── format.ts
```

## ファイル分類

- **エントリポイント**: `src/app/page.tsx`（メイン）, `src/app/game/page.tsx`
  （ゲームモード）, `src/app/layout.tsx`（共通レイアウト）。
- **純粋関数（ドメインロジック）**: `src/lib/simulation/*.ts`,
  `src/lib/game/*.ts`（`rng.ts` を除きテスト容易な副作用なしの関数群）。
- **状態管理（副作用あり）**: `src/lib/store/*.ts`（Zustand action、
  `localStorage` I/O を `persist` ミドルウェア経由でカプセル化）。
- **検証境界**: `src/lib/schema.ts`（zod スキーマ、`safeParse` の唯一の
  適用箇所）。
- **UIコンポーネント**: `src/components/**/*.tsx`（PascalCase 命名）。
- **テスト**: ソースとコロケーションされた `*.test.ts(x)` /
  `*.integration.test.ts`。詳細は `code-quality-assessment.md` を参照。

## コードパターン

- **命名規約**（`team.md` Code Style と一致を確認済み）: コンポーネントは
  PascalCase（例: `HouseholdForm.tsx`）、非コンポーネントロジックは camelCase
  / kebab-case（例: `usePlanStore.ts`, `number-input.ts`）。変数・関数は
  camelCase、zod スキーマは型名 PascalCase + スキーマ変数 camelCase
  （例: `PlanInput` 型 と `planInputSchema` 変数）。
- **異常系の戻り値型パターン**: `number-input.ts` の数値パーサは
  `value: number | null` を返し、`schema.ts` は `safeParse` の成否で分岐する。
  `try`/`catch` は今回のスキャン範囲で一切検出されなかった
  （`project.md` Forbidden 規約と一致）。
- **JSDoc コメント慣習**: ドメインロジックにはチケットID（`lp-XXX`）・QA番号
  付きの日本語ブロックコメントが徹底されている（例:
  `src/lib/simulation/engine.ts`, `src/components/forms/fields.tsx` の
  `NumberField`）。
- **単方向レイヤー依存**: `components → store → lib/simulation・lib/game →
  lib/schema`。今回のスキャンで逆方向依存の違反は検出されていない
  （`component-inventory.md` の「依存方向の遵守状況」を参照、詳細な依存関係
  グラフは `dependencies.md` を参照）。

## 今回のインテントに関連するコード箇所

`src/lib/simulation/types.ts:102-103`（`PlanInput.startYear`/`endYear` の型
定義）、`src/lib/schema.ts:78-89`（`planInputSchema`）、
`src/components/forms/HouseholdForm.tsx:190-203`（開始年・終了年フィールド）、
`src/lib/simulation/engine.ts:103`（`runSimulation` のループ条件）が issue #14
に直接関わる。行番号レベルの根本原因分析は `code-quality-assessment.md`
「Technical Debt Signals」に一本化して記録し、ここでは場所の参照のみとする。
