import {
  CATS,
  ITEMS,
  abilityTargetUnavailableReason,
  abilityUnavailableReason,
  act,
  buyUpgrade,
  createRun,
  currentUnit,
  damagePreview,
  endTurn,
  equip,
  initialProgress,
  isDamaging,
  nextRoom,
  type Ability,
  type Progress,
  type Run,
} from "./game";
import { EXPEDITION_REWARD } from "./progression";

/** Balance simulator: plays whole expeditions with a bot and reports what happened. */
export type BotName = "medium" | "optimal";
export interface Action {
  /** Undefined means "End turn". */
  abilityId?: string;
  targetId?: string;
}
export interface RunResult {
  won: boolean;
  /** Room (0-2) where the run ended; 3 when the boss fell. */
  endRoom: number;
  rounds: number[];
  /** Lowest living-cat count seen. */
  fewestAlive: number;
  /** Party HP percent when each room was cleared. */
  hpAtClear: number[];
  tier: number;
}

export const ALL_TEAMS: string[][] = CATS.flatMap((a, i) =>
  CATS.slice(i + 1).flatMap((b, j) =>
    CATS.slice(i + j + 2).map((c) => [a.id, b.id, c.id]),
  ),
);

const alive = <T extends { hp: number }>(units: T[]) =>
  units.filter((u) => u.hp > 0);

/** Every legal skill and target for the cat whose turn it is. */
export function legalActions(run: Run): Required<Action>[] {
  const actor = currentUnit(run)!;
  const out: Required<Action>[] = [];
  for (const ability of actor.abilities) {
    if (abilityUnavailableReason(run, ability)) continue;
    const ids =
      ability.target === "enemy"
        ? alive(run.enemies).map((u) => u.id)
        : ability.target === "ally"
          ? alive(run.party).map((u) => u.id)
          : ability.target === "fallen-ally"
            ? run.party.filter((u) => u.hp <= 0).map((u) => u.id)
            : [actor.id];
    for (const id of ids)
      if (!abilityTargetUnavailableReason(run, ability, id))
        out.push({ abilityId: ability.id, targetId: id });
  }
  return out;
}
const apply = (run: Run, action: Action): Run =>
  action.abilityId
    ? act(run, action.abilityId, action.targetId!)
    : endTurn(run);

/** Reasonable player: greedy damage per AP, heals when hurt, protects and revives. */
export function mediumAction(run: Run): Action {
  const actor = currentUnit(run)!;
  const legal = legalActions(run);
  const byId = (a: Required<Action>) =>
    actor.abilities.find((x) => x.id === a.abilityId)!;
  const allies = alive(run.party);
  const wounded = [...allies].sort(
    (a, b) => b.maxHp - b.hp - (a.maxHp - a.hp),
  )[0];
  const pick = (test: (ability: Ability) => boolean, target?: string) =>
    legal.find((a) => test(byId(a)) && (!target || a.targetId === target));
  const revive = pick((x) => x.effect === "revive");
  if (revive) return revive;
  const moon = pick((x) => x.effect === "ap");
  if (moon) return moon;
  if (wounded && wounded.hp <= wounded.maxHp * 0.6) {
    const group = allies.filter((c) => c.hp <= c.maxHp * 0.7).length >= 2;
    const heal =
      (group && pick((x) => x.effect === "heal-all")) ||
      pick((x) => x.effect === "heal", wounded.id);
    if (heal) return heal;
  }
  // Read the threads: shield the cat that the strongest enemy has marked.
  const threat = new Map<string, number>();
  for (const e of alive(run.enemies))
    if (e.mark)
      threat.set(e.mark, (threat.get(e.mark) ?? 0) + e.abilities[0]!.power);
  const marked = [...threat].sort((a, b) => b[1] - a[1])[0]?.[0];
  const shielded = allies.find((c) => c.id === marked && c.guard === 0);
  const shield = shielded && pick((x) => x.effect === "guard", shielded.id);
  if (shield) return shield;
  const bless = legal.find(
    (a) =>
      byId(a).effect === "fury" &&
      allies.some((c) => c.id === a.targetId && c.furyTurns === 0),
  );
  if (bless) return bless;
  const taunt = pick((x) => x.effect === "taunt");
  if (taunt && allies.some((c) => c.hp < c.maxHp * 0.7)) return taunt;
  const enemies = [...alive(run.enemies)].sort((a, b) => a.hp - b.hp);
  let best: Required<Action> | undefined;
  let bestScore = -1;
  for (const action of legal) {
    const ability = byId(action);
    if (!isDamaging(ability)) continue;
    for (const enemy of ability.target === "enemy" ? enemies : [enemies[0]!]) {
      let dealt = damagePreview(run, actor, ability, enemy).damage;
      if (ability.effect === "cleave")
        dealt = enemies.reduce(
          (sum, e) => sum + damagePreview(run, actor, ability, e).damage,
          0,
        );
      const score = dealt / ability.cost + (enemy.hp <= dealt ? 3 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = { abilityId: ability.id, targetId: action.targetId };
        if (ability.target === "enemy") best.targetId = enemy.id;
      }
    }
  }
  const guardLast = best ? undefined : pick((x) => x.effect === "guard");
  return best ?? guardLast ?? {};
}

function evaluate(run: Run): number {
  if (run.status === "defeat") return -1000;
  const hp = run.party.reduce((s, u) => s + u.hp / u.maxHp, 0);
  const up = alive(run.party).length;
  if (run.status === "victory") return 2000 + hp * 50;
  if (run.status === "reward") return 1000 + run.room * 400 + hp * 50 + up * 20;
  const foe = run.enemies.reduce((s, u) => s + u.hp / u.maxHp, 0);
  return hp * 40 + up * 25 - foe * 45 - alive(run.enemies).length * 12;
}

/** Beam search over the rest of the round; the engine is deterministic without crits. */
export function optimalPlan(run: Run, width = 24, maxDepth = 14): Action[] {
  interface Node {
    state: Run;
    path: Action[];
    score: number;
  }
  const round = run.round;
  const room = run.room;
  let beam: Node[] = [{ state: run, path: [], score: 0 }];
  const done: Node[] = [];
  for (let depth = 0; depth < maxDepth && beam.length; depth++) {
    const next: Node[] = [];
    for (const node of beam) {
      const options: Action[] = [...legalActions(node.state), {}];
      for (const action of options) {
        const state = apply(node.state, action);
        if (state === node.state) continue;
        const child = {
          state,
          path: [...node.path, action],
          score: evaluate(state),
        };
        if (
          state.status !== "combat" ||
          state.round !== round ||
          state.room !== room
        )
          done.push(child);
        else next.push(child);
      }
    }
    beam = next.sort((a, b) => b.score - a.score).slice(0, width);
  }
  const pool = done.length ? done : beam;
  pool.sort((a, b) => b.score - a.score);
  return pool[0]?.path ?? [{}];
}

/** Plays one expedition from the first turn to victory or defeat. */
export function playRun(
  progress: Progress,
  party: string[],
  seed: number,
  bot: BotName,
): RunResult {
  let run = createRun(progress, party, seed);
  const rounds: number[] = [];
  const hpAtClear: number[] = [];
  let fewestAlive = 3;
  for (let guard = 0; guard < 4000; guard++) {
    fewestAlive = Math.min(fewestAlive, alive(run.party).length);
    if (run.status === "reward") {
      rounds.push(run.round);
      hpAtClear.push(
        Math.round(
          (100 * run.party.reduce((s, u) => s + u.hp, 0)) /
            run.party.reduce((s, u) => s + u.maxHp, 0),
        ),
      );
      run = nextRoom(run);
      continue;
    }
    if (run.status !== "combat") break;
    const plan = bot === "optimal" ? optimalPlan(run) : [mediumAction(run)];
    for (const action of plan) {
      const before = run;
      run = apply(run, action);
      if (run === before) run = endTurn(run);
      if (run.status !== "combat") break;
    }
  }
  if (run.status === "victory") rounds.push(run.round);
  return {
    won: run.status === "victory",
    endRoom: run.status === "victory" ? 3 : run.room,
    rounds,
    fewestAlive,
    hpAtClear,
    tier: run.difficulty.tier,
  };
}

/**
 * A typical player's save after `wins` expedition victories: each win banks 90
 * gold and 135 XP, spent round-robin on the party's training, then the Hearth.
 */
export function playerAfter(wins: number, party: string[]): Progress {
  let p: Progress = {
    ...initialProgress(),
    gold: 30 + EXPEDITION_REWARD.gold * wins,
    xp: EXPEDITION_REWARD.xp * wins,
    wins,
  };
  if (wins >= 1) p = { ...p, inventory: [...ITEMS] };
  party.forEach((id, i) => {
    const item = ITEMS[i]!;
    if (p.inventory.includes(item)) p = equip(p, id, item);
  });
  for (let guard = 0; guard < 200; guard++) {
    const lowest = [...party].sort(
      (a, b) => (p.catLevels[a] ?? 0) - (p.catLevels[b] ?? 0),
    )[0]!;
    const trainRank = p.catLevels[lowest] ?? 0;
    const wantHearth =
      trainRank >= 3 && p.generalLevel < Math.floor(trainRank / 2);
    const next = wantHearth ? buyUpgrade(p) : buyUpgrade(p, lowest);
    if (next === p) break;
    p = next;
  }
  return p;
}

export interface Summary {
  runs: number;
  winRate: number;
  avgRounds: number;
  avgFewestAlive: number;
  avgHpAtClear: number[];
  lostInRoom: number[];
  tier: number;
}
export function summarize(results: RunResult[]): Summary {
  const n = results.length;
  const avg = (f: (r: RunResult) => number) =>
    results.reduce((s, r) => s + f(r), 0) / n;
  const roomAvg = (room: number) => {
    const hits = results.filter((r) => r.hpAtClear[room] !== undefined);
    return hits.length
      ? hits.reduce((s, r) => s + r.hpAtClear[room]!, 0) / hits.length
      : NaN;
  };
  return {
    runs: n,
    winRate: results.filter((r) => r.won).length / n,
    avgRounds: avg((r) => r.rounds.reduce((s, x) => s + x, 0)),
    avgFewestAlive: avg((r) => r.fewestAlive),
    avgHpAtClear: [0, 1, 2].map(roomAvg),
    lostInRoom: [0, 1, 2].map(
      (room) => results.filter((r) => !r.won && r.endRoom === room).length,
    ),
    tier: results[0]?.tier ?? 0,
  };
}
