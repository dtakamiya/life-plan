"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { runSimulation } from "@/lib/simulation/engine";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { GameHud } from "@/components/game/GameHud";
import { StageCard, type CardChoice } from "@/components/game/StageCard";
import { AdventureLog } from "@/components/game/AdventureLog";
import { GameResult } from "@/components/game/GameResult";
import {
  chooseStageOption,
  createGame,
  currentStage,
  pendingGameEvent,
  resolveEventChoice,
} from "@/lib/game/advance";
import { stageOptionsFor } from "@/lib/game/stages";
import { projectInput } from "@/lib/game/project";
import { computeStats } from "@/lib/game/stats";
import { summarizeSatisfaction } from "@/lib/game/satisfaction";
import type { GameState } from "@/lib/game/types";

/** seed を作る。SSR とクライアントで食い違わないよう、レンダー本体では呼ばない。 */
function makeSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

export default function GamePage() {
  const input = usePlanStore((s) => s.input);
  const saveSnapshot = usePlanStore((s) => s.saveSnapshot);
  const [hydrated, setHydrated] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);

  useEffect(() => setHydrated(true), []);

  const results = useMemo(
    () => (game ? runSimulation(projectInput(game.baseInput, game)) : []),
    [game],
  );
  const baseResults = useMemo(
    () => (game ? runSimulation(game.baseInput) : []),
    [game],
  );

  const stage = game ? currentStage(game) : null;
  // 進行中はステージ末まで、終了後は全期間で集計する。
  const stats = computeStats(results, stage ? stage.endYear : undefined);
  const baseStats = computeStats(baseResults);
  // ヘッダ HUD と結果テキストが参照する満足度指標の単一ソース。
  const satisfaction = summarizeSatisfaction(game?.log ?? []);

  const event = game ? pendingGameEvent(game) : null;

  const stageChoices: CardChoice[] = stage
    ? stageOptionsFor(stage).map((o) => ({
        id: o.id,
        label: o.label,
        description: o.description,
        cash: o.effect.cash,
        satisfaction: o.effect.satisfaction,
      }))
    : [];

  const eventChoices: CardChoice[] = event
    ? event.choices.map((c) => ({
        id: c.id,
        label: c.label,
        description: c.resultText,
        cash: c.effect.cash,
        satisfaction: c.effect.satisfaction,
      }))
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow className="mb-1.5 flex">Game mode</Eyebrow>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            人生の選択
          </h1>
          <p className="mt-1 text-xs text-ink-soft">
            10 年ごとの節目に方針を選び、いまのプランがどう変わるかを見ていきます。
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-line bg-surface/60 px-3.5 py-2 text-sm text-ink-soft transition-colors hover:border-ink-mute hover:text-ink"
        >
          プランに戻る
        </Link>
      </header>

      {!hydrated ? (
        <div className="flex h-72 items-center justify-center gap-2 text-sm text-ink-mute">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
          読み込み中…
        </div>
      ) : game === null ? (
        <Panel eyebrow="Start" title="はじめる">
          <p className="text-sm leading-relaxed text-ink-soft">
            いまトップページに入力されているプランを出発点にします。ここでの選択は
            本体の入力・グラフ・年次明細を書き換えません。
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
            イベントはゲーム上の演出です。あなたに起こる確率の予測ではありません。
          </p>
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={() => setGame(createGame(input, makeSeed()))}
            >
              はじめる
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <GameHud
              input={game.baseInput}
              stage={stage}
              stageCount={game.stages.length}
              stats={stats}
              satisfaction={satisfaction}
            />
          </div>

          <div className="space-y-6">
            {game.phase === "awaiting-stage-option" && stage && (
              <StageCard
                eyebrow="Chapter"
                title={`${stage.label}をどう生きるか`}
                description={`${stage.startYear}年から${stage.endYear}年までの${
                  stage.endYear - stage.startYear + 1
                }年間の方針を選びます。`}
                choices={stageChoices}
                onSelect={(id) => setGame((g) => (g ? chooseStageOption(g, id) : g))}
              />
            )}

            {game.phase === "awaiting-event-choice" && event && (
              <StageCard
                eyebrow="Event"
                title={event.title}
                description={event.description}
                choices={eventChoices}
                onSelect={(id) => setGame((g) => (g ? resolveEventChoice(g, id) : g))}
              />
            )}

            {game.phase === "finished" && (
              <GameResult
                state={game}
                stats={stats}
                baseStats={baseStats}
                satisfaction={satisfaction}
                onSave={(name) =>
                  saveSnapshot(name, projectInput(game.baseInput, game), "game")
                }
                onRestart={() => setGame(createGame(input, makeSeed()))}
              />
            )}

            <AdventureLog log={game.log} stages={game.stages} />
          </div>
        </div>
      )}
    </main>
  );
}
