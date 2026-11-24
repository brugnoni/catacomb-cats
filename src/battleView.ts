import type { Run } from "./game";

/** What the battle screen reads off a run and the selected target: pure, no state. */
export function turnView(run: Run, target: string) {
  const currentId = run.order[run.turn];
  const current = run.party.find((unit) => unit.id === currentId);
  const units = [...run.party, ...run.enemies];
  const canSelectFallen =
    current?.abilities.some((ability) => ability.target === "fallen-ally") ??
    false;
  return {
    currentId,
    current,
    units,
    canSelectFallen,
    selectedEnemy: run.enemies.find(
      (unit) => unit.id === target && unit.hp > 0,
    ),
    targetUnit: units.find(
      (unit) => unit.id === target && (unit.hp > 0 || canSelectFallen),
    ),
    // Who acts after the current cat in this round: the button passes the turn to them.
    nextCat:
      run.status === "combat"
        ? run.order
            .slice(run.turn + 1)
            .map((id) =>
              run.party.find((unit) => unit.id === id && unit.hp > 0),
            )
            .find(Boolean)
        : undefined,
  };
}

export type TurnView = ReturnType<typeof turnView>;
