# ゲームモード（人生の選択を進めるモード）設計

- 日付: 2026-09-06
- 対象: life-plan アプリへのゲーミフィケーション層の追加
- 改訂: v3。2 ラウンド・計 8 名のレビューを反映し、MVP まで縮小した

## 改訂の経緯

- **v1**: オーバーレイ方式（ベース結果に差分を単純加算）。→ 複利を落とすため破棄。
- **v2**: 効果を `PlanInput` へ射影し、区間分割して `runSimulation` を複数回実行。
  → **実測で不成立**（後述）。破棄。
- **v3（本書）**: 効果を `cash`（`LifeEvent`）に限定し、`runSimulation` を 1 回だけ掛ける。
  ターン粒度を 1 年からライフステージへ粗くし、スコープを 1 PR の MVP に絞った。

### v2 の区間分割実行が不成立である理由（実測）

`engine.ts` は給与と生活費を `Math.pow(1 + rate, year - startYear)` で複利計算している。
区間を切って `startYear` をずらすと `yearsElapsed` が 0 に戻り、
**昇給とインフレの複利が区間ごとに巻き戻る**。既定プランで 10 年目・25 年目に区間を切った実測値:

```
最終資産  通し実行 78,508,695 円 / 区間分割 94,015,685 円 → 約 20% の乖離
```

区間開始時に `grossAnnualIncome` と `baseAnnualLivingExpense` を経過年数ぶん前倒しスケール
すれば厳密一致させられることも実測で確認したが、それは**エンジンの時間軸をエンジンの外に
再実装する**ことに等しい。加えて配分決定を毎年行う設計では区間が最大 51 本に増える。
`engine.ts` 182 行に対して 1,137 行のテストという安全網がある以上、
その外側に第二のエンジンを置く判断は誤りである。

## 目的

ライフプランの最大の失敗モードは「入力が面倒で一度作って放置される」ことである。
節目ごとの選択を積み重ねる形でプランに触れさせ、放置を防ぐ。

シミュレーターとしての信頼性は一切犠牲にしない。ゲーム側の乱数はゲームモード内で完結し、
本体の入力・グラフ・年次明細を書き換えない。

**目標プレイ時間: 10〜15 分。** 機能の増減はこの数字を基準に判断する。

## スコープ（MVP: 1 PR）

含むもの:

- ライフステージ単位（6〜8 ターン）で進める「人生の選択」
- 各ステージの方針カード（3 択）と、割り込みイベント（選択肢つき）
- 満足度（金銭と交差する第 2 の軸）
- リザルト（事実の提示・ベース比・満足度の要約）
- 免責表示
- 専用ルート `/game` と、本体結果末尾からの CTA
- プレイ結果を「ゲーム由来」と明示してシナリオ保存する出口

含まないもの（MVP では作らない。必要性が確認できてから別 PR）:

- `src/lib/simulation/engine.ts` および計算式の変更
- `cash` 以外の効果（昇給・積立変更・進路変更）
- ゲーム進行の localStorage 永続化（MVP はセッション内 `useState`）
- 共通ヘッダー `AppHeader` の新設
- クエスト・実績・バッジ
- ランク・称号
- サーバー通信・ランキング

既存コードへの変更（MVP で必要な最小限）:

- `src/lib/store/usePlanStore.ts` — `saveSnapshot` が外部の `PlanInput` と `origin` を受け取れるようにする
- `src/lib/schema.ts` — `Snapshot` に `origin` を追加（既定値 `"manual"` で後方互換）
- `src/components/ScenarioBar.tsx` — ゲーム由来のシナリオにバッジを表示
- `src/app/page.tsx` — 結果セクション末尾に CTA カードを 1 つ追加

`vitest.config.ts` は変更しない（MVP に永続化がないため、jsdom を要するテストが発生しない）。
`summary.ts` の抽出も行わない（`page.tsx` の `Summary` と共用できるロジックが実質ないため）。

## アーキテクチャ

```
src/lib/game/
  types.ts     GameState, Stage, StageOption, GameEvent, EventChoice, GameEffect, GameStats
  rng.ts       seed 付き決定論的乱数
  stages.ts    プラン期間 -> ステージ列の導出、方針カードの定義テーブル
  events.ts    イベント定義テーブル（データのみ）
  project.ts   GameState -> PlanInput（約 20 行）
  advance.ts   advanceStage / resolveChoice（純関数の状態遷移）
  stats.ts     年次結果 -> GameStats（最小純資産・資産寿命・ベース比）
src/app/game/page.tsx
src/components/game/GameHud.tsx / StageCard.tsx / AdventureLog.tsx
```

`src/lib/game/` はすべて純関数とデータで構成し、React にも localStorage にも依存しない。
既存の `src/lib/simulation/*`（純関数）と同じ流儀である。

### 計算方式: `cash` 効果のみ、`runSimulation` を 1 回

すべての効果を `LifeEvent`（`{ id, year, label, amount }`）への追加として表現する。

```ts
// project.ts の全体像
export function projectInput(baseInput: PlanInput, state: GameState): PlanInput {
  return { ...baseInput, events: [...baseInput.events, ...toLifeEvents(state)] };
}
```

`engine.ts` の `eventNet` → `cashFlow` → `taxableEnd` の経路を通るため、
**複利・運用益課税・所得税・社会保険料・教育費の整合は完全に保たれる**。
「35 歳で失う 500 万円と 80 歳で失う 500 万円は違う」という v2 の核心の洞察は、
この方式でもそのまま成立する（実測: −20 万円は 5 年目で最終 −58 万円、45 年目で −22 万円）。

区間分割も再基準化も不要で、`project.ts` は約 20 行に収まる。
最も壊れやすいコンポーネントが、中核の主張を一切妥協せずに消える。

**将来 `income`（昇給・転職）を足す場合の方針**（MVP では作らない）:
`estimateIncomeTax` / `estimateResidenceTax` / `estimateSocialInsurance` は
いずれも export 済みで、エンジンと同じ関数をゲーム層から呼べる。

```
amount = netOf(給与_効果あり) − netOf(給与_効果なし)
```

を `LifeEvent` として計上すれば、区間分割方式と**差 0 円で一致する**（実測確認済み。
`Math.round` の適用が条件）。v2 が「税・社保を無視した二重基準になる」として
この案を棄却したのは誤りだった。

`contribution`（積立額の変更）はこの方式では原理的に表現できない
（`annualTaxFreeContribution` はループ外で 1 度だけ読まれる単一値のため）。
必要になった時点で、エンジンへの後方互換な小改修として検討する。

### 決定論

`GameState.seed` からステージごとの乱数列を派生させる。
同じ seed・同じ選択列なら結果は完全に再現される。

seed は SSR とクライアントで食い違ってはならないため、レンダー本体では生成しない。
ユーザー操作（「はじめる」「もう一度」）または `useEffect` の中でのみ生成する
（`defaults.ts` が `CURRENT_YEAR` をモジュール初期化時に固定しているのと同じ理由）。

## ターン設計

### ライフステージ粒度

1 年 1 ターン（既定プランで 51 ターン）をやめる。理由は 2 つ。

- 51 ターン中 31 ターンが「何も起きない年に次へを押すだけ」になる
- 毎年の配分決定を入れても、決定論エンジンでは最適解が固定スケジュールに解けてしまい、
  「前年の選択を既定値として保持」＋「5 年早送り」で実クリック数は生涯 2〜3 回に潰れる

代わりに、本人の年齢を 10 歳区切り（`... 30, 40, 50, 60, 70, 80 ...`）で区切り、
プラン期間と交差するブロックをステージとする。既定プラン（35 歳開始・50 年）では

```
35〜39歳 / 40代 / 50代 / 60代 / 70代 / 80〜85歳  → 6 ステージ
```

の 6 ターンになる。1 ターンあたりの重みが上がり、早送りが不要になり、
イベントが 6〜8 件でも反復感が出ない。

### 1 ターンの流れ

1. **方針カード**（必須）: 「この 10 年をどう生きるか」を 3 択から 1 つ選ぶ。
   各選択肢は `(cash, 満足度)` の組を持ち、**互いに支配関係がない**ように設計する。
   例（40 代）:
   - 質素に暮らす: cash 0 / 満足度 −4
   - 標準的に暮らす: cash −60 万円 / 満足度 +2
   - 暮らしを充実させる: cash −180 万円 / 満足度 +8
2. **イベント抽選**: 確率 `EVENT_RATE`（既定 0.6）で 0〜1 件。選択型なら選択肢を提示する。
3. **反映**: 効果を `LifeEvent` に積み、`projectInput` + `runSimulation` を掛け直して
   結果とステータスを更新する。冒険の記録に 1 行追加する。

**すべての選択肢は金銭と満足度を交差させる。**
金銭一次元の選択肢は常に安い方が最適解になり、選択が選択でなくなるため、必ず両軸を持たせる。
`cash` の発生年はステージの中央年とする（決定論を保つため乱数で散らさない）。

総決定回数は既定プランで 6 回の方針＋約 4 回のイベント選択 = 約 10 回。
目標プレイ時間 10〜15 分に収まる。

### 満足度

金銭に換算しない、独立した第 2 の評価軸として定義する。

- 初期値 50、範囲 0〜100 でクランプ
- 各ステージ終了時に **−3 の減衰**（減衰がないと上限に張り付き、終盤の選択が無意味になる）
- リザルトでは「平均満足度」と「満足度が 30 を割ったステージ数」を提示する

MVP では満足度が金銭に影響を与えるフィードバックループは作らない
（`income` 効果を含まないため実装できない）。したがって満足度は
**「もう 1 つのスコアボード」であり、金銭とのパレート的なトレードオフを作るためにある**。
「資産は貯まったが 40 年間ずっと満足度 20 台だった人生」を提示できることが、
このモードの固有の価値である。

満足度はゲーム上の演出であり、金融的な指標ではない旨を画面に明示する。

## ステータス表示

v1 の「HP = 純資産」は採用しない。
(a) 健全なプランでは単調増加し上限が定義できない、
(b) ここでの純資産は金融資産のみで持ち家もローン残債も含まない、
(c) 老後の計画的な取り崩しは正常であり「減る＝ダメージ」は誤ったメンタルモデルを与える。

| 表示 | 元データ | 備考 |
|---|---|---|
| 現在の純資産 | `YearlyResult.assets` | ステージ末時点 |
| これまでの最小純資産とその年齢 | 進行済み年の最小値 | **HUD の主ゲージ**。実際に動くのはこれ |
| 資産寿命 | 資産がプラスで持つ最終年齢 | **枯渇する場合のみ表示**。既定プランでは枯渇しないため常時表示しても動かない |
| 満足度 | ゲーム内 | 0〜100 |
| 年齢・ステージ | `selfAge` | 「レベル」とは呼ばない（老化は報酬ではない） |
| 世帯 | `PlanInput` | 配偶者・子を年齢とともに表示 |
| ローン | `PlanInput.loans` | 返済期間つきの負担として表示。**元本返済は純資産に中立で、真のコストは利息のみ**と注記する |

「HP」「装備」「呪いの装備」「ゴールド」の語は使わない。
`cashFlow` は運用損益を含まず純資産の増減と一致しないため、「ゴールド」として提示しない。

## リザルト

ランク S〜E と称号は採用しない。最終純資産は開始時点のプラン入力でほぼ確定しており
（トップページの `Summary` が既に表示している）、プレイ前に結果が決まっている。
加えて所得・家庭環境・介護負担といった本人の裁量外の要因への格付けになる。

提示するのは 3 つ。

1. **事実**: 「資産が最も薄くなったのは 52 歳（残 180 万円）」「資産寿命は 85 歳（枯渇せず）」
2. **ベース比**: 「基本計画と比べて最終資産 −240 万円 / 平均満足度 62」。
   資産が枯渇するケースでは**年数**でも示す（「基本計画より 4 年早く資産が尽きました」）。
   金額差は最終資産 7,850 万円に対して数%の解像度しかないため、年数を併記する。
3. **選択の要約**: 方針カードのログを集計し、「あなたは**教育に厚く、自分に薄い**50 年を選びました」
   のように 1 行で言う。

ベース比には無選択型イベントの結果も混入するため、
**「あなたの判断が生んだ増減」とは表示しない**（運と判断は原理的に分離できない）。
「基本計画との違い」という中立な表現に留める。

## 免責（必須要件）

ランダムイベントはモンテカルロ試行ではなく演出である（1 シード 1 試行、分布も示さない）。
にもかかわらず実在のリスク名で円単位の結果が出るため、次を必須とする。

- HUD に常設: 「イベントはゲーム上の演出です。あなたに起こる確率の予測ではありません」
- リザルト画面にも同文を明示
- ゲーム上の純資産グラフは本体と視覚的に区別する（破線）
- 満足度は金融的な指標ではない旨を併記

### シナリオ保存の扱い

リザルトから「この進行をシナリオとして保存」を提案する（実行はユーザーの明示操作）。
乱数由来の数値が本体のシナリオ比較に入るため、**ゲーム由来であることを恒久的に標識する**。

- `Snapshot` に `origin: "manual" | "game"` を追加する（`.default("manual")` で後方互換）
- `ScenarioBar` と比較グラフでゲーム由来のシナリオにバッジを付ける
- `usePlanStore.saveSnapshot` は現状 `(name)` のみを受け取り内部の `input` を複製する実装なので、
  外部の `PlanInput` と `origin` を受け取れるよう API を変更する

この標識により、免責節の「本体と区別する」原則と出口の両立を図る。
なお `/game` の数値を外部へエクスポート・共有する機能は設けない。

## イベント

- 初期 6〜8 件。すべて `cash` 効果のみ。
- 金額は `events.ts` の定数テーブルに置き、根拠をコメントで示す。
  `education.ts` が文科省調査を出典として明記している水準を下回らないこと。
  最低限のレンジ: 家電の故障 5〜20 万円、医療費 10〜30 万円（高額療養費の自己負担上限を踏まえる）、
  車の買い替え 150〜350 万円、住宅の修繕 100〜200 万円。
- 発生条件は年齢・子の年齢・配偶者の有無・ローンの有無で絞る。`once` で 1 プレイ 1 回に限定できる。
- 抽選は 2 段階: (1) ステージごとに確率 `EVENT_RATE` で発生判定、
  (2) 条件を満たす候補から `weight` 比で 1 件（候補数で発生率は変えない）。

## データモデル

```ts
type GameState = {
  seed: number;
  baseInput: PlanInput;        // 開始時に固定。本体入力を変えても進行が壊れない
  stages: Stage[];             // 開始時に導出したステージ列
  stageIndex: number;
  phase: "awaiting-stage-option" | "awaiting-event-choice" | "finished";
  satisfaction: number;        // 0-100、初期 50
  applied: AppliedEffect[];
  log: LogEntry[];
  pendingEvent: { stageIndex: number; eventId: string } | null;
};

type Stage = {
  index: number;
  label: string;               // 「40代」
  startYear: number;
  endYear: number;
  midYear: number;             // cash 効果の計上年
  startAge: number;
  endAge: number;
};

type GameEffect = { cash: number; satisfaction: number };

type AppliedEffect = {
  id: string;
  year: number;
  label: string;
  effect: GameEffect;
  source:
    | { kind: "stage-option"; stageIndex: number; optionId: string }
    | { kind: "event-choice"; eventId: string; choiceId: string };
};

type StageOption = { id: string; label: string; description: string; effect: GameEffect };
type EventChoice = { id: string; label: string; effect: GameEffect; resultText: string };

type GameEvent = {
  id: string;
  title: string;
  description: string;
  weight: number;
  condition?: EventCondition;
  choices: EventChoice[];      // 無選択型は「了解」1 つだけを持つ
};

type EventCondition = {
  minSelfAge?: number;
  maxSelfAge?: number;
  requiresChildAged?: { min: number; max: number };
  requiresSpouse?: boolean;
  requiresActiveLoan?: boolean;
  once?: boolean;
};

type LogEntry = {
  stageIndex: number;
  text: string;
  cash: number;
  satisfaction: number;
  assetsAtStageEnd: number;
};
```

状態遷移は 2 関数に分ける（1 関数に optional 引数で多重化しない）。

```ts
chooseStageOption(baseResults, state, optionId): GameState  // 方針確定 → イベント抽選まで
resolveEventChoice(baseResults, state, choiceId): GameState // 選択型イベントの確定
```

`phase` が両者の呼び分けを型で表現する。

## 画面

- レイアウトは本体と同じ 2 カラム（`lg:grid-cols-[380px_1fr]`）。
  左に HUD、右に方針カード・イベント・冒険の記録。
- モバイルでは HUD を上部 sticky、主操作を下部固定バーに。
- ステージ数が 6〜8 と少ないため、早送りもオートプレイも設けない。

### デザイン言語

既存は明朝見出し（Zen Old Mincho）＋ペーパー基調＋ティール / ゴールドという
「資産レポートの品格」である。ドット絵やネオンは信頼性を壊すため使わない。

- **新色を追加しない**（`chartTheme.ts` の `seriesPalette` を流用）
- 世界観は語彙（冒険の記録）と構造（HUD・カード）だけで出す
- 既存の `Panel` + `Eyebrow`（`Chronicle` など）で構成する
- ゲームモードであることは控えめなモードバッジ 1 つで示す

### アクセシビリティ（受け入れ条件）

- 満足度・純資産のバー: `role="progressbar"` + `aria-valuemin/max/now` +
  `aria-valuetext="満足度 62"`。バー自体は `aria-hidden` とし、数値を必ずテキストで併記
- 状態表示は色のみに依存しない（色 + アイコン + テキストの 3 チャネル）
- ステージ確定・イベント結果は `aria-live="polite"` の領域へ出し、
  フォーカスを新しいカードの見出しへ移す
- キーボード: `1`〜`3` で選択肢、`Enter` で確定
- 演出は `matchMedia("(prefers-reduced-motion: reduce)")` を見て即時反映に切り替える。
  JS タイマーによる演出は `globals.css` の reduced-motion ガードをすり抜けるため、
  CSS だけに頼らない
- コントラスト 4.5:1 を維持する

### 破壊的操作

MVP は永続化しないため、失われるのは進行中のプレイのみ。
「もう一度」は確認ダイアログを出す（`<dialog>`、フォーカストラップ、`Esc` で閉じる、
確認ボタンに初期フォーカスを当てない）。既存の `Button variant="danger"` を使う。

## テスト方針

Vitest。既存 `src/lib/simulation/*.test.ts` と同じ流儀で純関数をテストする。
UI は `npm run build` の型チェックと Lint で担保する。

- `rng.test.ts` — 同一 seed で同一列、異なる seed で異なる列、値域 `[0,1)`
- `project.test.ts` — **効果ゼロのとき `runSimulation(baseInput)` と全フィールド一致すること**。
  `cash` 効果が指定年の `eventNet` に正しく載ること。同年に複数の効果が合算されること
- `stages.test.ts` — プラン期間からのステージ導出（10 歳区切り、開始・終端の端数ブロック、
  期間が 10 年未満のとき、開始年齢がちょうど区切りのとき）
- `advance.test.ts` — 同じ seed・同じ選択列で最終状態が一致（決定論）、
  ステージが 1 つずつ進む、終端で `finished`、
  `awaiting-event-choice` 中に `chooseStageOption` を呼べないこと、
  `baseInput` が変化しないこと、満足度のクランプ（0 未満・100 超）と減衰
- `events.test.ts` — 定義の静的整合（id 重複なし、選択肢 1 件以上、
  **すべての選択肢が金銭と満足度の両方を持ち、支配関係がないこと**）、
  および固定 seed での抽選列のゴールデン固定（統計的な収束テストは flaky なので採らない）
- `stats.test.ts` — 最小純資産・資産寿命の境界値（初年に枯渇、終端まで枯渇しない、
  途中で一度マイナスになって回復）
- `usePlanStore` の `saveSnapshot` API 変更と `origin` の既定値による後方互換
  （既存 `assumptions.test.ts` と同じく node 環境で書ける範囲に留める）

## 規模の見積もり

新規 5〜6 ファイル + テスト、既存 4 ファイルへの小変更。合計 500〜700 行。

これは既存の PR 粒度（`lp-002` が 407 行 / 6 ファイル、最大の機能 PR が 1,130 行 / 20 ファイル）
と整合する。v2 の 5 フェーズ案は新規約 28 ファイル・3,200〜4,000 行で、
既存 `src/` 全体（4,098 行）とほぼ同規模、かつフェーズ 4 完了（全工数の約 7 割）まで
動くものが一切出なかった。MVP は 1 PR でユーザーに届き、外れても捨てられる。

## MVP の後に検討すること（今は作らない）

前段の反応を見てから、それぞれ独立した PR として判断する。

| 内容 | 前提 |
|---|---|
| 永続化（`gameSaveSchema` / `useGameStore` / `loadError`） | 「続きからやりたい」の声が出たら |
| `income` 効果（昇給・転職） | 上記の手取り差分方式で。区間分割は使わない |
| 多段イベント（3〜4 件で 1 本の筋） | イベントの反復感が問題になったら |
| クエスト・実績 | 本体のグラフが既に提供していない価値を示せたら |
| `AppHeader` 共通ヘッダー | 実際に導線で迷子が出たら |
| 満足度から金銭へのフィードバック | `income` 効果の実装後 |
