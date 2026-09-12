# コンポーネント一覧（life-plan）

各コンポーネントの詳細な責務・依存関係を一元管理する（唯一の所有ファイル）。
他の成果物（`architecture.md`, `code-structure.md` 等）はここを参照する。

凡例: 「深度」列 = developer-scan.md の Scan Coverage に基づく分析深度
（Deep = 精読済み、Shallow = ディレクトリ/シグネチャ単位の確認のみ）。

## UI 層（`src/app/`, `src/components/`）

| コンポーネント | ファイル | 責務 | 依存 | 深度 |
|---|---|---|---|---|
| RootLayout | `src/app/layout.tsx` | アプリ全体のレイアウト・グローバルCSS読み込み | なし | Deep |
| PlanPage | `src/app/page.tsx` | メインのシミュレーター画面。フォーム入力・`runSimulation` 呼び出し・結果表示の統合 | PlanStore, SimulationEngine, HouseholdForm, LoanForm, ResultTable, charts/* | Deep |
| GamePage | `src/app/game/page.tsx` | 「人生ゲーム」モード画面 | PlanStore, GameStages, GameAdvance, GameHud | Deep |
| HouseholdForm | `src/components/forms/HouseholdForm.tsx` | 世帯情報・シミュレーション期間（開始年/終了年）入力フォーム | FormFields, PlanStore | Deep |
| LoanForm | `src/components/forms/LoanForm.tsx` | ローン情報入力フォーム | FormFields, NewLoanFactory, PlanStore | Deep |
| FormFields | `src/components/forms/fields.tsx` | `NumberField` 等の共通フォームフィールド。`error` prop による検証表示・aria-invalid 連携を実装済み | NumberInputUtil | Deep |
| NumberInputUtil | `src/components/forms/number-input.ts` | 数値入力の文字列⇔数値変換ユーティリティ（例外を投げず `number \| null` を返す） | なし | Deep |
| ExpenseForm | `src/components/forms/ExpenseForm.tsx` | 支出項目入力フォーム | FormFields, PlanStore | Shallow |
| AssetForm | `src/components/forms/AssetForm.tsx` | 資産項目入力フォーム | FormFields, PlanStore | Shallow |
| EventForm | `src/components/forms/EventForm.tsx` | ライフイベント入力フォーム | FormFields, PlanStore | Shallow |
| AssumptionsPanel | `src/components/AssumptionsPanel.tsx` | 前提条件（インフレ率等）の表示・編集パネル | PlanStore | Shallow |
| ScenarioBar | `src/components/ScenarioBar.tsx` | シナリオの保存・切替UI | PlanStore | Shallow |
| ResultTable | `src/components/ResultTable.tsx` | シミュレーション結果の年次テーブル表示。空配列時は `<tbody>` が空になり通知なし | なし（`results: YearlyResult[]` を受け取る） | Deep |
| charts/NetWorthChart, CashFlowChart, ComparisonChart | `src/components/charts/*.tsx` | Recharts による結果グラフ描画 | recharts, chartTheme | Shallow |
| GameHud | `src/components/game/GameHud.tsx` | 人生ゲームのステータス表示UI | PlanStore, GameStages | Deep |
| AdventureLog, GameResult, StageCard | `src/components/game/*.tsx` | 人生ゲームの演出コンポーネント群 | GameStages, GameEvents | Shallow |
| ui/Button, Panel, Eyebrow, ConfirmDialog | `src/components/ui/*.tsx` | 汎用UIプリミティブ | なし | Shallow |

## 状態管理層（`src/lib/store/`）

| コンポーネント | ファイル | 責務 | 依存 | 深度 |
|---|---|---|---|---|
| PlanStore | `src/lib/store/usePlanStore.ts` | Zustand によるグローバル状態。`setRange`, `updateSelf`, `addLoan` 等 約20メソッド。`persist` ミドルウェアで localStorage 永続化、復元時に zod スキーマで `safeParse` | PersistenceSchema | Deep |
| NewLoanFactory | `src/lib/store/newLoan.ts` | ローン新規追加時の初期値生成（0円始まり） | SimulationTypes | Deep |

## ドメインロジック層（`src/lib/simulation/`, `src/lib/game/`）

| コンポーネント | ファイル | 責務 | 依存 | 深度 |
|---|---|---|---|---|
| SimulationTypes | `src/lib/simulation/types.ts` | `PlanInput`, `YearlyResult` 等のドメイン型定義。`startYear`/`endYear` に大小関係制約なし | なし | Deep |
| SimulationEngine | `src/lib/simulation/engine.ts` | `runSimulation(input): YearlyResult[]` — 年次ループでキャッシュフロー・資産推移を計算する中核純関数。`startYear > endYear` で空配列を無言で返す（issue #14 の直接原因の一つ、詳細は `code-quality-assessment.md`） | SimulationDefaults, LoanCalculator, education/pension/socialInsurance/tax | Deep |
| SimulationDefaults | `src/lib/simulation/defaults.ts` | 初期入力値・デフォルトパラメータ定義 | SimulationTypes | Deep |
| LoanCalculator | `src/lib/simulation/loan.ts` | ローン返済額計算 | SimulationTypes | Deep |
| education, pension, socialInsurance, tax | `src/lib/simulation/*.ts` | 教育費・年金・社会保険・税額の個別計算ロジック | SimulationTypes | Shallow |
| GameTypes | `src/lib/game/types.ts` | 人生ゲームのステージ・イベント型定義 | SimulationTypes | Deep |
| GameStages | `src/lib/game/stages.ts` | `while (cursorYear <= endYear)` でステージ列を生成。同型の期間逆転リスクを内包（`code-quality-assessment.md` 参照） | GameTypes, SimulationTypes | Deep |
| GameAdvance | `src/lib/game/advance.ts` | ステージ進行ロジック | GameTypes, GameStages | Deep |
| GameEvents | `src/lib/game/events.ts` | ランダムイベント定義・発生ロジック | GameTypes, rng | Deep |
| project | `src/lib/game/project.ts` | ゲーム内の資産投影計算 | SimulationEngine, GameTypes | Shallow |
| rng, satisfaction, stats | `src/lib/game/*.ts` | 乱数生成・満足度指標・統計集計 | GameTypes | Shallow |

## 永続化・検証層（`src/lib/schema.ts`）

| コンポーネント | ファイル | 責務 | 依存 | 深度 |
|---|---|---|---|---|
| PersistenceSchema | `src/lib/schema.ts` | `planInputSchema` / `snapshotSchema`（zod）。localStorage 復元時の検証境界。フィールド単位の検証のみで、`startYear`/`endYear` 相互検証は未実装 | なし | Deep |

## 横断ユーティリティ

| コンポーネント | ファイル | 責務 | 依存 | 深度 |
|---|---|---|---|---|
| assumptions | `src/lib/assumptions.ts` | 前提条件（インフレ率等）のデフォルト値・計算補助 | なし | Shallow |
| format | `src/lib/format.ts` | 金額・日付等の表示フォーマット | なし | Shallow |

## 依存方向の遵守状況

すべて `components → store → lib/simulation・lib/game → lib/schema` の単方向依存
（`team.md` Code Style 規約）を維持していることを確認済み。逆方向依存の違反は
今回のスキャン範囲では未検出。詳細な依存グラフは `dependencies.md` を参照。
