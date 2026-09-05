# ゲームモード（RPG 風ライフプラン）設計

- 日付: 2026-09-06
- 対象: life-plan アプリへのゲーミフィケーション層の追加
- 改訂: v2（4 名によるレビュー（ゲーム設計 / アーキテクチャ / ドメイン整合 / UX・A11y）を反映）

## 目的

ライフプラン・シミュレーターに RPG 感覚のプレイ要素を追加し、数値の羅列ではなく
「自分の人生を進めていく」体験として計画を眺められるようにする。

ライフプランの最大の失敗モードは「入力が面倒で一度作って放置される」ことである。
年送りで少しずつ触らせる設計はこれに効く。ただし、シミュレーターとしての信頼性は
一切犠牲にしない。

## スコープ

含むもの:

- 年次結果を RPG 的なステータスとして表現する導出ロジック
- 1 年ずつ進める「年送りプレイ」。毎年の配分決定と、ランダムに割り込むイベント（選択肢つき）
- クエスト（ユーザー定義の目標）と実績（バッジ）
- 進行状況の localStorage への永続化
- 専用ルート `/game` と、本体との相互導線
- プレイ結果を「シナリオとして保存」する出口（実行はユーザーの明示操作）

含まないもの:

- `src/lib/simulation/engine.ts` およびシミュレーションの計算式の変更
- サーバー通信・ランキング・マルチプレイ
- ローンの繰上返済（エンジンが元本残高を追跡していないため表現できない）
- プレイ結果を本体の現在入力へ自動で書き戻すこと（保存はシナリオ経由のみ）

既存コードへの変更（v2 で拡大。いずれも計算式には触れない）:

- `src/lib/simulation/summary.ts` の新設と、`src/app/page.tsx` の `Summary` からのロジック抽出
- 共通ヘッダーコンポーネントの新設とモード切替導線
- `vitest.config.ts` に jsdom 環境の追加（ストアのテストのため）

## アーキテクチャ

```
src/lib/game/
  types.ts         GameSave, GameEvent, EventChoice, GameEffect, Allocation,
                   Quest, Achievement, GameStats, GameContext
  rng.ts           seed 付き決定論的乱数
  project.ts       GameSave -> PlanInput への射影（効果を入力差分に変換）
  stats.ts         GameContext -> GameStats（資産寿命・ゴールド・世帯・スコア）
  events.ts        イベント定義テーブル（データのみ）
  advance.ts       advanceYear / resolveChoice（純関数の状態遷移）
  quests.ts        クエスト定義と達成時点の算出
  achievements.ts  実績の判定
src/lib/simulation/summary.ts   最終・最小純資産・枯渇年の算出（本体と共用）
src/lib/store/useGameStore.ts   Zustand + persist（キー分離）
src/app/game/page.tsx           ゲームモード画面
src/components/game/GameHud.tsx / EventCard.tsx / AllocationPanel.tsx /
  AdventureLog.tsx / QuestList.tsx / AchievementList.tsx / GameHeaderNotice.tsx
src/components/layout/AppHeader.tsx   本体・ゲームモードの共通ヘッダー
```

`src/lib/game/` 配下はすべて純関数とデータで構成し、React にも localStorage にも
依存しない。Zustand ストアは「保存」と「純関数の呼び出し」だけを担う。
これは既存の `src/lib/simulation/*`（純関数）と `usePlanStore`（保存のみ）と同じ流儀である。

### 計算方式: エンジン再実行（v2 で変更）

v1 の「表示上の純資産 = ベース純資産 + イベント差分の累積」というオーバーレイ方式は破棄する。

理由: エンジンは年間収支を課税口座残高へ組み入れ、翌年その残高を複利で回す
（`engine.ts` の `taxableBase` → `taxableGain` → `taxableEnd`）。ある年に生じた収支差分は
以降 `1 + r×(1 − CAPITAL_GAINS_RATE)` 倍で成長する。既定の年利 3% では年約 2.4%、
30 年で約 2 倍の乖離になる。単純加算はこの複利を落とすため、本体の結果と整合しない。
さらに「35 歳で失う 500 万円」と「80 歳で失う 500 万円」がゲーム上同価値になり、
ライフプランを題材にしたときの最大の面白さと教育的価値が消える。

代わりに、ゲームの効果を `PlanInput` への差分に射影し、`runSimulation` を掛け直す。

```ts
// project.ts
function projectInput(baseInput: PlanInput, save: GameSave): PlanInput
// advance / resolve のたびに
const results = runSimulation(projectInput(baseInput, save));
```

エンジンは無改変のまま使う。50 年ループは純関数で軽量なので、毎ターンの再実行で問題ない。
この方式なら複利・運用益課税・所得税・社会保険料・教育費の再計算がすべて正しく効く。

### 効果の射影規則

ゲームの効果は 4 種類に限定し、それぞれ `PlanInput` の対応する場所へ落とす。
金額を直接足す表現は使わない（税・社保を無視した二重基準を避けるため）。

| `GameEffect.kind` | 射影先 | 例 |
|---|---|---|
| `cash` | `events` に `LifeEvent` を 1 件追加 | 家電の故障、臨時ボーナス |
| `income` | 対象 `Person` の `grossAnnualIncome` を、開始年から `years` 年ぶん変更 | 昇給、転職、時短勤務 |
| `education` | 対象 `Child.education` の該当ステージを変更 | 私立進学の選択 |
| `contribution` | `assets.annualContribution` を変更 | 配分決定でリスク資産を厚くする |

`income` と `contribution` は「額面（税引き前）の変更」であり、手取りへの反映は
エンジンの `estimateSocialInsurance` / 所得税・住民税の計算に委ねる。

`grossAnnualIncome` は `PlanInput` 上は単年の値なので、年ごとに異なる収入を表現するには
`projectInput` が「その年の入力」を作るのではなく、**効果の適用期間を持つ入力列**が必要になる。
本設計では、エンジンを変更しない制約のもとで次の方針を採る。

- `income` 効果は、その効果が有効な各年について、**差分を `LifeEvent` の手取り換算額として計上する**のではなく、
  `projectInput` が効果の適用開始年以降の `grossAnnualIncome` を書き換えた入力を作り、
  **効果の切れ目ごとに区間を分けて `runSimulation` を複数回実行し、区間の年次結果を連結する**。
  各区間の開始時点の資産残高は前区間の期末残高を初期資産として引き継ぐ。
- この「区間分割実行」は `project.ts` に閉じ込め、`advance.ts` からは 1 関数として見える。
- 区間が 1 つ（効果なし）のときの結果が、本体の `runSimulation(input)` と完全一致することを
  テストで固定する。

### 決定論

`GameSave.seed` から年ごとの乱数列を派生させる。同じ seed・同じ選択列・同じ配分列を与えれば、
イベント抽選も最終状態も完全に再現される。

seed は SSR とクライアントで食い違ってはならないため、レンダー本体では生成しない。
ユーザー操作（「はじめる」「最初から」）または `useEffect` の中でのみ生成する。
これは `defaults.ts` が `CURRENT_YEAR` をモジュール初期化時に固定しているのと同じ理由による。

## データモデル

```ts
type GameContext = {
  baseInput: PlanInput;      // ゲーム開始時に固定したプラン入力
  save: GameSave;
};

type GameSave = {
  version: 1;
  seed: number;
  planFingerprint: string;   // 開始時のプラン入力のハッシュ（差異検出用）
  baseInput: PlanInput;      // 開始時の入力そのもの（本体入力の変更から独立させる）
  startYear: number;
  currentYear: number;
  phase: "playing" | "awaiting-choice" | "finished";
  effects: AppliedEffect[];  // これまでに確定した効果（射影の入力）
  allocations: { year: number; allocationId: AllocationId }[];
  satisfaction: number;      // 満足度 0-100（ゲーム内限定の非金銭軸）
  log: GameLogEntry[];
  pendingEvent: { year: number; eventId: string } | null;
  unlockedAchievements: string[];
  choicesMade: { year: number; eventId: string; choiceId: string }[];
};

type AppliedEffect = {
  id: string;
  year: number;              // 効果の開始年（発生年と同じ年から効く）
  source: { eventId: string; choiceId: string } | { allocationId: AllocationId };
  effect: GameEffect;
};

type GameEffect =
  | { kind: "cash"; label: string; amount: number }                       // 単年
  | { kind: "income"; personId: "self" | "spouse"; delta: number; years: number }
  | { kind: "education"; childId: string; stage: EducationStage; value: string }
  | { kind: "contribution"; delta: number; years: number };

type GameEvent = {
  id: string;
  title: string;
  description: string;
  weight: number;                    // 候補内での抽選比。発生率とは別
  condition?: EventCondition;
  choices: EventChoice[];            // 無選択型は「了解」1 つだけを持つ
};

type EventCondition = {
  minSelfAge?: number;
  maxSelfAge?: number;
  requiresChildAged?: { min: number; max: number };
  requiresSpouse?: boolean;
  requiresActiveLoan?: boolean;
  once?: boolean;                    // 1 プレイに 1 回だけ
};

type EventChoice = {
  id: string;
  label: string;
  effects: GameEffect[];
  satisfactionDelta: number;         // 非金銭軸のトレードオフ
  resultText: string;
};

type AllocationId = "savings" | "invest" | "self-investment" | "enjoy";

type GameLogEntry = {
  year: number;
  allocationId: AllocationId;
  eventId?: string;
  choiceId?: string;
  text: string;
  assetsAtYearEnd: number;
};
```

`GameSave` は開始時の `baseInput` を丸ごと保持する。本体の入力をあとから変更しても
進行中のプレイは壊れない。`planFingerprint` は本体入力との差異をユーザーに知らせるためだけに使う。

### modifier の適用モデル（v1 の曖昧さを解消）

- `years` を持つ効果は **発生年を含む** `years` 年間に効く。プラン終端を超える分は切り捨てる。
- 同一 `kind` の効果が重なった場合は **加算**する（上書きしない）。
- `income` / `contribution` の `delta` は **名目額**（インフレ調整しない）。生活費だけが
  エンジン側でインフレ複利調整される点は本体と同じ挙動になる。
- 残余年数は状態として持たず、`effects` の `year` と `years` から毎回導出する。

### イベント抽選の確率モデル（v1 の曖昧さを解消）

2 段階とする。

1. **発生判定**: 年ごとに 1 回、確率 `EVENT_RATE`（既定 0.4）で「イベントあり」を判定する。
   候補が 0 件のときは何も起きない。
2. **候補内抽選**: `condition` を満たすイベントを候補とし、`weight` 比で 1 件選ぶ。
   候補数によって発生率は変えない（正規化する）。

この設計では、イベント定義を 1 件追加すると既存 seed のリプレイ結果が変わる。
仕様として受け入れ、セーブに `version` を持たせて互換性の期待をユーザーに約束しない。

## ゲーム要素

### ステータス表現（v2 で全面改訂）

v1 の「HP = 純資産」は採用しない。理由は 3 つ。
(a) 純資産は健全なプランでは単調増加し、上限が定義できないためバーとして描けない。
(b) ここでの純資産は金融資産のみで、持ち家もローン残債も含まない。
(c) 老後に資産を計画的に取り崩すのは正常であり、「減る＝ダメージ」は誤ったメンタルモデルを与える。

| ゲーム表現 | 元データ | 定義 |
|---|---|---|
| 資産寿命 | 年次結果 | 資産がプラスで持つ最終年齢。上限はプラン終端年齢、下限は現在年齢。上下限が明確でバーとして成立する |
| 年齢 | `selfAge` | 「レベル」とは呼ばない（老化は報酬ではない）。「〇年目・〇歳」と素直に表示する |
| ゴールド | `cashFlow` | その年の収支。運用損益を含まないので、資産の増減とは別枠で「運用による増減」を併記する |
| 満足度 | ゲーム内限定 | 0〜100。金銭以外のトレードオフ軸。**ゲーム内の演出であり金融的な指標ではない**と明示する |
| 世帯 | `PlanInput.people` / `children` | 配偶者・子を年齢とともに表示。「パーティ」の語は使うが機構は持たせない |
| ローン | `PlanInput.loans` | 「呪いの装備」ではなく「返済期間つきの負担」。**元本返済は純資産に中立で、真のコストは利息のみ**と注記する |

「装備」メタファは機構がなく名前の言い換えにすぎないため削除する。

### スコア（ランク・称号は廃止）

v1 の S〜E ランクと称号は採用しない。最終純資産は開始時点のプラン入力でほぼ確定しており
（トップページの Summary が既に表示している）、プレイ前に結果が決まっている。
加えて所得・家庭環境・介護負担といった本人の裁量外の要因への格付けになり、
プレイヤーを評価する軸として不適切である。

代わりに 2 つを提示する。

- **事実の提示**: 「資産が最も薄くなったのは 52 歳（残 180 万円）」「資産寿命は 91 歳」
- **ベース比の差分**: 「基本計画と比べて最終資産 +320 万円 / 満足度 +12」。
  プレイヤーの選択が生んだ増減のみを測るので、入力フォームの豪華さではなく判断が評価される。

### 年送りプレイ

1 ターン = 1 年。各ターンは次の順序で進む。

1. **配分決定**（毎ターン必須）: その年の使い道を 1 つ選ぶ。
   - `savings` 貯蓄に回す（効果なし＝課税口座に積む）
   - `invest` リスク資産を厚くする（`contribution` +）
   - `self-investment` 自己投資（当年 `cash` −、翌年以降 `income` +）
   - `enjoy` 今年を楽しむ（当年 `cash` −、満足度 +）
   前年の選択が既定値として保持される。同じ配分のまま次の年へ進むのは 1 クリックで済む。
2. **イベント抽選**: 上記の確率モデルで 0〜1 件。選択型なら `phase = "awaiting-choice"` になる。
3. **結果反映**: 効果を `effects` に積み、`projectInput` + `runSimulation` を掛け直して
   年次結果とステータスを更新する。ログに 1 行追加する。

プラン終端に到達したら `phase = "finished"` とし、リザルトを表示する。

配分決定を毎年入れる理由は、v1 の設計では 51 ターン中 31 ターンが「何も起きない年に
次へを押すだけ」だったため。配分決定によって毎ターンに意思決定が生まれ、
ゴールドに使い道ができ、イベントが「毎年の判断に割り込む刺激」として機能する。

補助として「配分を維持して 5 年進む」を用意する（選択型イベントに当たったら自動停止）。
50 回のクリックを強制しないための最小限の措置。

イベントの選択肢は必ず金銭以外の軸（満足度）を交差させる。
「安いが満足度を削る」「高いが後年の負担を減らす」という形にしないと、
常に安い選択肢が最適解になり、選択型イベントは実質無選択型に退化する。

### イベントの金額レンジ

金額は `events.ts` の定数テーブルに置き、根拠をコメントで示す。
`education.ts` が文科省調査を出典として明記している水準を下回らないこと。
初期セットはトレードオフを持つ 6〜8 件とする（一次元の選択肢を 15 件並べても体験は増えない）。

### クエストと実績

- **クエストはユーザーが定義する**。「45 歳までに純資産 2000 万円」のような金額を
  こちらから規範として提示しない。プリセットは「例」と明示し、金額・年齢を編集可能にする。
  達成 / 未達の判定ではなく「この計画では 47 歳で到達」という**時点の提示**に留める。
- **実績**はプレイ中の到達バッジ。獲得型のみとし、一度獲得したら剥奪しない。
  ベース結果だけで自動的に決まるもの（「ローン完済」など）と、
  ネガティブなもの（「資産ゼロを経験」など）は入れない。
  プレイヤーの判断が関与するもの（「満足度 70 以上を保って完走」など）に限る。

### 免責（必須要件）

ランダムイベントはモンテカルロ試行ではなく演出である（1 シード 1 試行、分布も示さない）。
にもかかわらず実在のリスク名で円単位の結果が出るため、次を必須とする。

- HUD に常設: 「イベントはゲーム上の演出です。あなたに起こる確率の予測ではありません」
- リザルト画面にも同文を明示
- ゲーム上の純資産グラフは本体と視覚的に区別する（破線など）
- `/game` の数値をエクスポート・共有する機能は設けない

### 画面と導線

- **共通ヘッダー**（`AppHeader.tsx` を新設）に本体 / ゲームモードの切替を常設する。
  トップにリンクを 1 行足すだけでは気づかれない。加えて結果セクション末尾に
  「このプランをゲームで進めてみる」カード型 CTA を 1 つ置く。
- `/game` のレイアウトは本体と同じ 2 カラム（`lg:grid-cols-[380px_1fr]`）に揃える。
  左に HUD とステータス、右にイベント・配分・記録。
- モバイルでは HUD を上部 sticky、主操作（配分＋次の年へ）を下部固定バーにする。
  年表・クエスト・実績はアコーディオンに畳み、既定は「冒険の記録」のみ開く。
  実績の獲得はトースト、一覧はモーダルへ。
- リザルトで「この進行をシナリオとして保存」を提案する。実行はユーザーの明示操作で、
  既存の `usePlanStore.saveSnapshot` に `projectInput` の結果を渡す。
  これによりゲームが既存の複数シナリオ比較につながり、余興として孤立しない。

### デザイン言語

既存は明朝見出し（Zen Old Mincho）＋ペーパー基調＋ティール / ゴールドという
「資産レポートの品格」である。ドット絵やネオンは信頼性を壊すため使わない。

- 色とタイポは既存のまま。**新色を追加しない**（`chartTheme.ts` の `seriesPalette` を流用）
- RPG 感は語彙（冒険の記録、クエスト、実績）と構造（HUD・カード・バッジ）だけで出す
- `gold` を実績・満足度、ティールを資産寿命、`danger` を危機に割り当てる
- 既存の `Panel` + `Eyebrow`（`Chronicle` / `Quest` / `Achievements`）で構成する
- ゲームモードであることは控えめなモードバッジ 1 つで示す

### アクセシビリティ（受け入れ条件）

- 資産寿命バー: `role="progressbar"` + `aria-valuemin/max/now` +
  `aria-valuetext="資産寿命 91歳"`。バー自体は `aria-hidden` とし、数値を必ずテキストで併記
- 状態表示は色のみに依存しない（色 + アイコン + テキストの 3 チャネル）。
  既存 `page.tsx` の tone アクセントバーが `aria-hidden` で隣にテキスト値を持つのと同じ原則
- イベント結果・年送り後の更新は `aria-live="polite"` の領域へ出し、
  フォーカスを新しいイベントカードの見出しへ移す
- キーボード: `Enter` / `Space` で次の年、`1`〜`4` で配分、`Esc` でダイアログを閉じる。
  ショートカット一覧を画面内に明示する
- 演出は `matchMedia("(prefers-reduced-motion: reduce)")` を見て即時反映に切り替える。
  JS タイマーによる演出は `globals.css` の reduced-motion ガードをすり抜けるため、
  CSS だけに頼らない
- コントラスト 4.5:1 を維持する

### 破壊的操作

- 「最初から」「セーブを削除」は確認ダイアログ必須。`<dialog>` でフォーカストラップ、
  `Esc` で閉じる、確認ボタンに初期フォーカスを当てない。
  確認文には失われるもの（プレイ年数・獲得実績数）を具体的に書く。
  既存の `Button variant="danger"` を使う
- **セーブを無断で自動破棄しない**。読み込めない場合はユーザーに選ばせる

## 永続化とエラー処理

- persist キーは `life-plan-game/v1`、`version: 1`、`migrate` を最初から用意する
- `src/lib/schema.ts` に `gameSaveSchema` を追加し、`merge` の中で zod 検証する。
  既存 `usePlanStore` と同じく、`.default()` で新フィールドを補い、全破棄を避ける
- `unlockedAchievements` の未知 id は**保持**する（「剥奪しない」方針に従う）
- ストアに `loadError: "schema" | "plan-changed" | null` を持たせ、画面側で伝える。
  `merge` は同期的でトーストを出せないため、状態として持つ必要がある
- `planFingerprint` が本体入力と異なる場合は「プランが変わりました。続行 / 最初から」を提示する。
  セーブが `baseInput` を保持しているので、続行しても計算は破綻しない
- localStorage が使えない環境（Safari プライベート等では throw する）では
  no-op storage へフォールバックし、セッション内プレイとして動作させる
- セーブは 1 スロット

## テスト方針

Vitest。既存 `src/lib/simulation/*.test.ts` と同じ流儀で純関数をテストする。
ストアのテストはファイル先頭に `// @vitest-environment jsdom` を置く
（`vitest.config.ts` は `environment: "node"` のため。jsdom は devDependency に既存）。

- `rng.test.ts` — 同一 seed で同一列、異なる seed で異なる列、値域が `[0,1)`
- `project.test.ts` — **効果ゼロのとき `runSimulation(baseInput)` と完全一致すること**（最重要）。
  各 `kind` が正しい入力フィールドへ落ちること。区間分割実行の資産引き継ぎが連続すること。
  `years` の境界（発生年を含む、終端で切り捨て）、同一 kind の加算
- `advance.test.ts` — 同じ seed・選択列・配分列で最終セーブが一致（決定論）、
  年が 1 ずつ進む、終端で停止、`awaiting-choice` 中に `advanceYear` を呼べないこと、
  `baseInput` が変化しないこと
- `stats.test.ts` — 資産寿命の境界値（初年に枯渇、終端まで枯渇しない、途中で一度マイナス）、
  ベース比スコアの符号
- `events.test.ts` — 定義の静的整合（id 重複なし、選択肢 1 件以上、満足度軸を持つこと）
  に加え、**多数試行での発生率が `EVENT_RATE` に収束すること**と `weight` 比の分布
- `condition.test.ts` — 年齢境界、子の年齢、配偶者・ローンの有無、`once` の効き方
- `achievements.test.ts` — 発火条件、獲得後に剥奪されないこと
- `useGameStore.test.ts`（jsdom）— **保存 → 復元 → 続行が通しプレイと一致すること**、
  スキーマ不一致時に `loadError` が立ち自動破棄しないこと、旧 JSON からの移行、
  localStorage 不可環境でのフォールバック
- `summary.test.ts` — 抽出したロジックが従来の `Summary` と同じ値を返すこと

UI コンポーネントの単体テストは行わず、`npm run build` の型チェックと Lint で担保する。
状態遷移の妥当性は `advanceYear` / `resolveChoice` の分離によって型で表現する。

## 実装フェーズ

各フェーズを 1 つの PR とし、TDD で実装する。

1. **基盤** — `summary.ts` の抽出（本体と共用）、`types.ts` / `rng.ts` / `stats.ts` とテスト。UI なし。
2. **射影** — `project.ts`（区間分割実行と効果の射影）とテスト。
   効果ゼロで本体と一致することの検証を含む。ここが最も壊れやすいので単独の PR とする。
3. **進行エンジン** — `events.ts`（初期 6〜8 件）、`advance.ts`（`advanceYear` / `resolveChoice`）とテスト。
4. **ストアと画面** — `gameSaveSchema`、`useGameStore`、`AppHeader`、`/game` ページ、
   HUD・配分・イベントカード・年表。A11y 受け入れ条件を満たすこと。
5. **クエスト・実績・出口** — `quests.ts` / `achievements.ts` とテスト、一覧 UI、
   リザルトからのシナリオ保存提案。
