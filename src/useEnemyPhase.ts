import { useEffect, useEffectEvent, useState } from "react";
import type { Run } from "./game";
import { pace } from "./storage";

/** A round banner, or one enemy's turn (events `from` up to `to`). */
type Step =
  | { kind: "banner"; round: number }
  | {
      kind: "attack";
      actorId: string;
      round: number;
      from: number;
      to: number;
    };

const FIRST_MS = 150;
const BANNER_MS = 1300;
const LAND_MS = 600;
const ATTACK_MS = 1600;

/** The banners and enemy turns, in order, that the last action produced. */
export function buildSteps(run: Run, fromRound: number): Step[] {
  const steps: Step[] = [];
  let round = fromRound;
  run.events.forEach((event, index) => {
    if (event.actorId === undefined || event.round === undefined) return;
    const last = steps.at(-1);
    if (
      last?.kind === "attack" &&
      last.to === index &&
      last.actorId === event.actorId &&
      last.round === event.round
    ) {
      last.to++;
      return;
    }
    if (event.round !== round)
      steps.push({ kind: "banner", round: (round = event.round) });
    steps.push({
      kind: "attack",
      actorId: event.actorId,
      round: event.round,
      from: index,
      to: index + 1,
    });
  });
  if (run.status === "combat" && run.round !== round)
    steps.push({ kind: "banner", round: run.round });
  return steps;
}

/**
 * Plays what happened after the player's action step by step: a banner when a
 * round starts, then each enemy turn on its own (it is highlighted, then its
 * hit lands). Each step owns two ticks, plus one final tick when all is done.
 */
export function useEnemyPhase(run: Run, fromRound: number) {
  const steps = buildSteps(run, fromRound);
  const [played, setPlayed] = useState({ id: run.eventId, tick: 0 });
  const tick = played.id === run.eventId ? played.tick : 0;
  const start = useEffectEvent(() => {
    let at = FIRST_MS;
    const times: number[] = [];
    for (const step of steps) {
      const span = step.kind === "banner" ? BANNER_MS : ATTACK_MS;
      times.push(at, at + (step.kind === "banner" ? BANNER_MS : LAND_MS));
      at += span;
    }
    times.push(at);
    const timers = times.map((ms, index) =>
      setTimeout(
        () => setPlayed({ id: run.eventId, tick: index + 1 }),
        pace(ms),
      ),
    );
    return () => timers.forEach(clearTimeout);
  });
  useEffect(() => start(), [run.eventId]);

  const phasing = steps.length > 0 && tick <= 2 * steps.length;
  const current = steps.findIndex((_, index) => tick === 2 * index + 1);
  const shown = current >= 0 ? steps[current] : undefined;
  const landed = steps.map(
    (step, index) => step.kind === "attack" && tick >= 2 * index + 2,
  );
  const latest = landed.lastIndexOf(true);
  const firstTagged = run.events.findIndex((e) => e.actorId !== undefined);

  /** Whether an event is still hidden, and the flash it should play when shown. */
  const eventView = (index: number) => {
    const step = steps.findIndex(
      (s) => s.kind === "attack" && index >= s.from && index < s.to,
    );
    if (step < 0) {
      // Events after the enemy turns (the next cat's turn start) wait for them.
      const late = firstTagged >= 0 && index > firstTagged;
      return {
        hidden: late && phasing,
        flash: !(late && phasing),
        salt: 0,
        offset: index,
      };
    }
    const from = (steps[step] as { from: number }).from;
    return {
      hidden: !landed[step],
      flash: step === latest,
      salt: step + 1,
      offset: index - from,
    };
  };
  return {
    phasing,
    bannerRound: shown?.kind === "banner" ? shown.round : 0,
    actingId: shown?.kind === "attack" ? shown.actorId : "",
    /** The first enemy turn of a battle that opens with enemy hits. */
    opening: fromRound === 0 && steps.some((s) => s.kind === "attack"),
    eventView,
  };
}
