# lp-023: 年次明細テーブルの先頭2列を横スクロール時に固定する（#20）

## 背景 / Spec

GitHub issue #20。モバイル幅（375px）で「年次明細」テーブルを横スクロールすると、
左端の「年」「本人年齢」列も一緒に流れてしまい、どの年の行を見ているのか分からなくなる。
先頭の「年」「本人年齢」列をスクロール時も左端に固定表示したい。

対象は `src/components/ResultTable.tsx` のみ（＋同ディレクトリの新規テスト）。
`thead` はすでに `sticky top-0` で縦方向に固定済み。今回は横方向の固定を追加する。

## Global Constraints

- 依存方向は `components` → `store` → `lib` の単方向を維持する。今回の変更は
  `src/components/ResultTable.tsx` と新規テスト `src/components/ResultTable.test.tsx` に閉じること。
- 例外を投げない。`try`/`catch` を使わない。
- コンポーネントテストは `@testing-library/react` を使わず、`react-dom/client` の
  `createRoot` と生 DOM による自前ハーネスを使う。ファイル冒頭に
  `// @vitest-environment jsdom` を書く。
- テストは対象ファイルと同一ディレクトリにコロケーションする。
- コメント・コミットメッセージは日本語、識別子は英語。
- Tailwind のカラートークンは `tailwind.config.ts` に定義済みのもの
  （`paper` / `paper-deep` / `surface` / `ink` / `line` / `brand-50` 等）を使う。
  生の 16 進数カラーを新規に書かない。
- 既存の `id`（既定 `"result-table"`、チャートの `aria-describedby` 参照元）と
  列構成・表示内容・`formatYen` によるフォーマットは変更しない。
- `npm run test` と `npm run build` が通ること。

## Task 1: 先頭2列を sticky 固定し、回帰テストを追加する

### 変更対象

- `src/components/ResultTable.tsx`
- `src/components/ResultTable.test.tsx`（新規）

### 実装方針

1. `columns` の各要素に固定列用のメタ情報を持たせる。
   `{ key, label, sticky?: "year" | "selfAge" }` のように型を拡張するか、
   `STICKY_KEYS` のような定数で `year` / `selfAge` を判別する。どちらでもよいが、
   `th` と `td` で同じ判定ロジックを共有し、重複したクラス文字列を 2 箇所に
   べた書きしないこと。

2. 固定列の水平位置は固定幅で確定させる。
   - `year` 列: `sticky left-0 w-16`
   - `selfAge` 列: `sticky left-16 w-16`
   （`w-16` = 4rem = 64px、`left-16` は `year` 列の幅と一致させること。
   `w-14`（56px）は `px-3` の左右パディング（24px）と 4 桁 `text-xs` 数値の
   実幅（約 27〜29px）に対して余裕が数 px しかなく、フォントフォールバック次第で
   列が重なる恐れがあるため `w-16` に広げた。
   `th`/`td` の両方に同じ幅クラスを付け、`box-border` 前提の Tailwind 既定で
   ズレないようにする。左オフセットと幅の対応が崩れると列が重なるので、
   数値は必ず一致させる。）

3. 固定セルは背景が透けてはいけない（下を流れる列が透過して見えてしまうため）、
   不透明な背景を与える。既存の行ゼブラ `odd:bg-paper/40` は半透明なので、
   固定セルでも同じ縞模様を再現できるよう次のように変更する。
   - `tr` に `group` を付け、ゼブラを不透明トークン `odd:bg-paper` に変更する
     （`/40` の半透明をやめる。見た目はごく僅かに濃くなるが、固定セルとの
     色ズレを避けるための意図的な変更）。
   - 固定 `td` には `bg-surface group-odd:bg-paper group-hover:bg-brand-50` を付け、
     行ホバー時も他列と同じ強調が効くようにする。
     （既存の `tr` の `hover:bg-brand-50/60` も不透明な `hover:bg-brand-50` に揃える。）
   - 固定 `th` には `thead` と同じ `bg-paper-deep` を付ける（`/95` の半透明ではなく
     不透明トークン。`thead` 側の `bg-paper-deep/95 backdrop-blur` はそのまま残して
     よいが、固定 `th` 自身は不透明にすること）。

4. z-index の重なり順を明示する。
   - `thead` は `sticky top-0 z-20`（`z-10` から変更）。
   - 固定列の `th`（縦横とも固定される角のセル）は `z-30`（`z-20` から変更）。
   - 固定列の `td` は `z-10`（変更なし）。
   （注意: `thead` は `position:sticky` により独自のスタッキングコンテキストを
   生成するため、その内部にある固定 `th` の z-index は `thead` の外にある
   固定 `td` の z-index とは直接比較されない。つまり `th z-20` 対 `td z-10` の
   ような「内部 th の値」対「外部 td の値」の組み合わせでは意図した重なり順に
   ならず、実際には「thead レイヤの z 値」対「固定 td の z 値」で比較される。
   当初案の `thead z-10` / 固定 th `z-20` / 固定 td `z-10` では、コンテナが
   `max-h-96 overflow-auto` で縦スクロールも発生するため、縦スクロール中に
   同値比較となる `thead z-10` と固定 `td z-10` の間で DOM 順が後ろの `tbody` 側の
   固定 td が前面に出てしまい、不透明な `bg-surface` の固定データセルが
   ヘッダー見出しを覆う不具合が生じる。そのため `thead` 自体を `z-20` に上げ、
   `thead` の外側にある固定 `td`（`z-10`）より確実に手前に来るようにし、
   角セルの固定 `th` はさらにその手前（`z-30`）に置く。）

5. 固定列の右端（`selfAge` 列）に `border-r border-line` を付け、
   スクロールする列との境界を視認できるようにする。

6. `year`/`selfAge` セルは数値なので既存の `text-right` 配置・
   `whitespace-nowrap`・`year` の `font-medium text-ink` 等の既存スタイルを維持する。

### テスト（`src/components/ResultTable.test.tsx`）

`// @vitest-environment jsdom` を冒頭に置き、`react-dom/client` の `createRoot` で
`<ResultTable results={...} />` をマウントする自前ハーネスで、少なくとも以下を検証する。
`results` には `YearlyResult` 型（`src/lib/simulation/types.ts`）を満たすダミー行を
2 行以上（ゼブラ確認のため奇数行・偶数行が両方できるように）用意する。
実データを作るために `lib/simulation` のエンジンを呼ぶ必要はない。

1. 「年」列の `th` と全 `td` が `sticky` と `left-0` クラスを持つ。
2. 「本人年齢」列の `th` と全 `td` が `sticky` と `left-16`（= `year` 列の幅と一致）を持つ。
3. 3 列目以降（例: 「世帯収入(税込)」）の `th`/`td` は `sticky` クラスを持たない。
4. 固定 `td` が不透明な背景クラス（`bg-surface`）を持ち、半透明指定
   （`/40` のようなアルファ付きクラス）を含まない。
5. `year` 列と `selfAge` 列の幅クラスと `left-*` オフセットが整合している
   （`year` の幅クラスの数値 = `selfAge` の `left-` の数値）。
6. z-index の不変条件: 固定 `td` の z 値 < `thead` の z 値、かつ固定 `th`
   （角セル）の z 値 > 固定 `td` の z 値。jsdom では実描画は検証できないため、
   class 文字列から `z-<n>` の数値を抽出して比較する。

### 完了条件

- `npx vitest run src/components/ResultTable.test.tsx` が全件パス。
- `npm run test` が全件パス（既存テストの回帰なし）。
- `npm run build` が成功。
- 変更は上記 2 ファイルのみ。
