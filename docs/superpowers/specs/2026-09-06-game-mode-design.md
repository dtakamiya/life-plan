# ゲームモード（RPG 風ライフプラン）設計

- 日付: 2026-09-06
- 対象: life-plan アプリへのゲーミフィケーション層の追加

## 目的

ライフプラン・シミュレーターに RPG 感覚のプレイ要素を追加し、数値の羅列ではなく
「自分の人生を進めていく」体験として計画を眺められるようにする。

シミュレーターとしての信頼性は損なわない。ゲーム側で発生する乱数イベントは
ゲームモード内でのみ完結し、本体の入力・グラフ・年次明細には一切影響しない。

## スコープ

含むもの:

- 純資産・年齢・キャッシュフローなどを RPG のステータス（HP / レベル / ゴールド等）として表現する導出ロジック
- 1 年ずつ進める「年送りプレイ」と、その年に発生するランダムイベント（選択肢つき）
- クエスト（目標達成）と実績（バッジ）
- 進行状況の localStorage への永続化
- 専用ルート `/game` と、トップページからの導線

含まないもの:

- 既存 `SimulationInput` / `src/lib/simulation/engine.ts` の変更
- サーバー通信・ランキング・マルチプレイ
- プレイ結果を本体の入力へ書き戻す機能（将来の別提案とする）

## アーキテクチャ

```
src/lib/game/
  types.ts         GameSave, GameEvent, EventChoice, Achievement, Quest, GameStats
  rng.ts           seed 付き決定論的乱数
  stats.ts         YearlyResult + GameSave -> HP / レベル / ゴールド / ランク / 称号
  events.ts        イベント定義テーブル（データのみ）
  advance.ts       advanceYear(save, baseResults, choiceId?) -> 次の GameSave
  achievements.ts  実績・クエストの判定
src/lib/store/useGameStore.ts   Zustand + persist（既存ストアとキーを分離）
src/app/game/page.tsx           ゲームモード画面
src/components/game/*           HUD・イベントカード・年表・実績一覧
```

`src/lib/game/` 配下はすべて純関数とデータで構成し、React にも localStorage にも依存しない。
Zustand ストアは「保存」と「純関数の呼び出し」だけを担う。

### オーバーレイ方式

ベースとなる年次結果は既存の `runSimulation(input)` の戻り値をそのまま使う。
ゲーム層はその上に「その年のイベント収支の差分」と「以降の年に効く modifier」だけを保持し、

    表示上の純資産 = ベース結果の純資産 + それまでのイベント差分の累積

として計算する。エンジンを再実行しないため、本体の結果と常に整合が取れる。

### 決定論

`GameSave.seed` から年ごとの乱数列を派生させる。同じ seed と同じ選択列を与えれば、
イベントの抽選結果も最終状態も完全に再現される。これによりゲーム進行を単体テストできる。

## データモデル

```ts
type GameSave = {
  seed: number;              // 乱数シード（ゲーム開始時に確定）
  startYear: number;         // プレイ開始年（= プラン開始年）
  currentYear: number;       // 現在進行中の年
  balanceDelta: number;      // イベントによる累積収支差分（円）
  modifiers: ActiveModifier[]; // 以降の年に効く継続効果
  log: GameLogEntry[];       // 冒険の記録（年ごとの出来事）
  pendingEvent: PendingEvent | null; // 選択待ちのイベント
  unlockedAchievements: string[];    // 獲得済み実績 id
  choicesMade: { year: number; eventId: string; choiceId: string }[];
};

type GameEvent = {
  id: string;
  title: string;
  description: string;
  weight: number;                 // 抽選の重み
  condition?: EventCondition;     // 年齢・子の有無・純資産帯などの発生条件
  choices: EventChoice[];         // 無選択型は「了解」1 つだけを持つ
};

type EventChoice = {
  id: string;
  label: string;
  immediateAmount: number;        // 即時の収支（円、マイナスは支出）
  modifier?: { kind: string; amountPerYear: number; years: number };
  resultText: string;
};
```

## ゲーム要素

### ステータス表現

| ゲーム表現 | 元データ |
|---|---|
| HP | 純資産（0 未満で「危機」表示、計画期間中の最小純資産を下限マーカーとして表示） |
| レベル | 本人の年齢 |
| ゴールド | その年のキャッシュフロー（黒字は獲得、赤字は消費） |
| 装備 | 保有資産・ローン（ローンは「呪いの装備」として毎年ダメージを表示） |
| パーティ | 世帯（配偶者・子。子は年齢に応じて表示が変わる） |
| ランク・称号 | 最終純資産と資産枯渇の有無から S〜E のランクと称号を決定 |

ランクの境界値および称号の対応は `stats.ts` に定数テーブルとして持ち、テストで固定する。

### 年送りプレイ

「次の年へ」の操作で 1 年進む。各年、seed 由来の乱数で発生条件を満たすイベントを
0 件または 1 件抽選する。年あたりのイベント発生確率は合計 40% 程度を上限とする。

- 無選択型イベント（昇給、臨時ボーナス、家電の故障、医療費など）は即時の収支差分のみ。
- 選択型イベント（転職するか、車を買い替えるか、子の進学先など）は 2〜3 の選択肢を持ち、
  それぞれ即時の収支と、以降の年に効く modifier を持つ。

プラン終端の年に到達したらプレイは終了し、ランク・称号・実績を集計したリザルトを表示する。

### クエストと実績

- クエストは目標達成型（例:「45 歳までに純資産 2000 万円」「教育費のピークを赤字なしで越える」）。
  ベース結果とプレイ結果の両方から達成判定を行い、達成年を年表に記録する。
- 実績はプレイ中の到達バッジ（例:「初めての 1000 万」「ローン完済」「10 年間ノーダメージ」「資産ゼロを経験」）。
  一度獲得した実績は剥奪されず、`unlockedAchievements` に永続化される。

### 画面

`/game` に専用ページを新設する。

- 上部: HUD（HP バー、レベル、ゴールド、現在年）
- 中央: その年のイベントカード（選択型なら選択肢ボタン）と「次の年へ」
- 下部: 冒険の記録（年表ログ）、クエスト一覧、実績一覧
- 操作: 「最初から」「セーブを削除」

既存トップページへの変更は、ゲームモードへのリンクを 1 行追加するだけに留める。

## 永続化

`useGameStore` は Zustand の persist ミドルウェアを使い、既存の `usePlanStore` とは
別の localStorage キーに保存する。ハイドレーション完了までゲーム画面の本体を描画しない点は
既存トップページと同じ方式に揃える。

セーブは 1 スロットのみとする。「最初から」を選ぶと新しい seed でセーブを作り直す。

## エラー処理

- 保存済みセーブのスキーマが現在の型と合わない場合は、セーブを破棄して新規開始とし、その旨を画面に表示する。
- 現在のプラン入力が変わってプラン期間が短くなり、`currentYear` が範囲外になった場合も同様に新規開始を促す。
- localStorage が利用できない環境では、セーブなしのセッション内プレイとして動作させる。

## テスト方針

Vitest。既存の `src/lib/simulation/*.test.ts` と同じ流儀で純関数をテストする。

- `rng.test.ts` — 同一 seed で同一列、異なる seed で異なる列、値域が `[0,1)` に収まること
- `advance.test.ts` — 同じ seed と同じ選択列で最終セーブが一致すること（決定論）、
  年が必ず 1 ずつ進むこと、プラン終端で停止すること、modifier が指定年数だけ効くこと、
  ベース結果が変化しないこと
- `stats.test.ts` — HP・レベル・ランクの境界値（純資産 0、マイナス、枯渇あり / なし）
- `achievements.test.ts` — 各実績の発火条件、獲得後に剥奪されないこと
- `events.test.ts` — イベント定義の整合性（id の重複なし、重みが上限内、選択肢が 1 つ以上）

UI コンポーネントの単体テストは行わず、`npm run build` の型チェックと Lint で担保する。

## 実装フェーズ

各フェーズを 1 つの PR とし、TDD で実装する。

1. **基盤** — `types.ts` / `rng.ts` / `stats.ts` とテスト。UI なし。
2. **進行エンジン** — `events.ts`（初期 15 件程度）、`advance.ts` とテスト。
3. **ストアと画面** — `useGameStore`、`/game` ページ、HUD・イベントカード・年表。
4. **クエストと実績** — `achievements.ts` とテスト、一覧 UI、トップページからの導線。

既存コードへの変更はフェーズ 3 のトップページへのリンク追加のみ。
