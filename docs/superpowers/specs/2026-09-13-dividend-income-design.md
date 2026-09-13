# 投資資産からの配当・分配金の受取 設計

## 目的

保有する投資資産（課税口座・非課税口座）から毎年受け取る配当・分配金を試算に反映し、
生活費への充当（年間収支の収入）として確認できるようにする。

## 決定事項

| 論点 | 決定 |
|------|------|
| 配当の使い道 | 再投資せず、毎年現金で受け取り年間収支（`cashFlow`）に計上する |
| 運用利回りとの関係 | **別枠**。資産の値上がりは既存の運用利回りで計算し、配当は追加で受け取る（総リターン＝運用利回り＋配当利回り） |
| 受取期間 | 開始年から終了年まで常に受け取る（年齢指定・再投資切替はしない） |
| 利回りの粒度 | 両口座共通の配当利回り 1 つ（口座別設定は YAGNI として見送り） |
| 既定値 | 0%（既存データ・既存の試算結果を変えない） |

見送った案:

- 口座別の配当利回り: 既存の運用利回りも両口座共通であり、入力の増加に見合わない。
- 継続収入として金額を手入力: 資産残高と連動せず、資産が減っても配当が減らない。

## 1. データモデル

### `AssetSettings`（`src/lib/simulation/types.ts`）

```ts
/** 配当・分配金の年間利回り（小数。両口座共通、運用利回りとは別枠で現金受取） */
annualDividendYield: number;
```

### `YearlyResult`（`src/lib/simulation/types.ts`）

```ts
/** その年に受け取った配当・分配金の手取り（円、課税口座分は税引後） */
dividendIncome: number;
/** 課税口座の配当にかかる税の概算（円） */
dividendTax: number;
```

`dividendTax` は既存の `investmentTax`（運用益課税）とは合算せず、別項目として持つ。

### 永続化スキーマ（`src/lib/schema.ts`）

`annualDividendYield: z.number().default(0)` とし、項目を持たない既存の保存データも
検証を通して 0 として読み込む。`retirementBenefit` と同じ後方互換パターン。

### 既定値（`src/lib/simulation/defaults.ts`）

`annualDividendYield: 0`。

## 2. 計算モデル（`src/lib/simulation/engine.ts`）

各年、非課税口座への積立を移した後の残高（`taxableBase` / `taxFreeBase`）を基準にする。

```
taxableDividend = max(taxableBase, 0) × annualDividendYield
dividendTax     = round(taxableDividend × CAPITAL_GAINS_RATE)
taxFreeDividend = max(taxFreeBase, 0) × annualDividendYield
dividendIncome  = round(taxableDividend − dividendTax + taxFreeDividend)

cashFlow = （従来の各項目） + dividendIncome
```

- 資産の値上がり（`taxableGain`、`taxFreeEnd` の複利成長）は従来どおり運用利回りのみで
  計算し、配当利回りの影響を受けない。
- 配当は現金受取のため、年間収支として課税口座に入る（その年は複利を効かせない、
  従来の収支と同じ簡易扱い）。結果として非課税口座の配当も翌年以降は課税口座で運用される。
- 配当は申告分離課税を想定し、給与の所得税・住民税（`estimateIncomeTax` 等）の計算には含めない。
- 口座残高がマイナスの場合（課税口座の取り崩し超過）は、保有資産がないとみなして
  その口座の配当を 0 とする（配当・税がマイナスにならない）。

## 3. UI・表示

### 入力（`src/components/forms/AssetForm.tsx`）

- 「運用利回り」の隣に `PercentField`「配当利回り」を追加する。
  - `help="dividendYield"`、補足 `hint="運用利回りとは別に受取"`
  - `signed` は付けない（マイナス入力不可）
- フォーム下部の注記に「配当・分配金は毎年現金で受け取り、課税口座分は約20%課税」を追記する。

### 年次明細（`src/components/ResultTable.tsx`）

「退職金」列の後ろに `{ key: "dividendIncome", label: "配当(手取)" }` を追加する。
`dividendTax` は `investmentTax` と同じく列には出さない。

### 用語解説（`src/lib/glossary.ts`）

`dividendYield` を追加する。

- term: 「配当利回り」
- description: 保有資産に対して毎年受け取る配当・分配金の割合であること、
  このアプリでは運用利回りとは別枠で全額を現金で受け取り生活費に回す扱いであること、
  課税口座分には約20%課税され非課税口座分は非課税であることを初心者向けに説明する。

### 前提一覧（`src/lib/assumptions.ts`）

「資産運用の年間リターン」の直後に行を追加する。

- label: 「配当・分配金の利回り」
- value: `formatPercent(assets.annualDividendYield)`
- note: 「入力値。両口座に同率で適用し毎年現金で受取。課税口座分は運用益と同率で課税。」

### 変更しないもの

- `CashFlowChart` の「収入」棒は手取り給与のみ（退職金も含まない）という既存方針のため変更しない。
  配当は「収支」棒に反映される。
- ゲームモード（`src/lib/game`）・`SummaryBar` は既存項目のみを参照するため変更しない。

## 4. エラーハンドリング

- 数値入力の異常系（空文字・符号のみ等）は既存の `PercentField` / `number-input` の
  null 許容戻り値の仕組みに従う。
- 保存データの検証失敗は既存どおり `safeParse` の失敗で既定値にフォールバックする。
  例外は投げない。

## 5. テスト

| ファイル | 検証内容 |
|----------|----------|
| `src/lib/simulation/engine.test.ts` | 配当利回り 0% で従来と同じ結果になる／課税口座の配当から 20% が差し引かれ、非課税口座の配当は満額で `cashFlow` に加算される／資産の値上がり（運用益・`investmentTax`）は配当利回りに依存しない／課税口座残高がマイナスの年は配当・配当税が 0 |
| `src/lib/schema.test.ts` | `annualDividendYield` を持たない保存データが 0 として読み込まれる |
| `src/lib/assumptions.test.ts` | 配当利回りの前提行が含まれる |
| `src/lib/glossary.test.ts` | `dividendYield` の用語が定義されている |
| `src/components/ResultTable.test.tsx` | 「配当(手取)」列が表示される |
| フォームの DOM ハーネステスト | 配当利回りの入力で store の `annualDividendYield` が更新される |
| `YearlyResult` リテラルを持つテスト（`stats.test.ts`、`stages.test.ts`、`SummaryBar.test.tsx`、`summary.test.ts` 等） | 新しい 2 項目をフィクスチャに追加する |

検証コマンド: `npm run test`、`npm run build`、`npx eslint .`。
