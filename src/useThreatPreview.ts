import { useEffect, useState } from "react";
import { type IntentEntry } from "./IntentArrows";
import { type TurnView } from "./battleView";
import { useT } from "./i18n";
import { abilityReach, enemyIntent, type Run } from "./game";
import { pace } from "./storage";

/** How long a resting cursor waits to outline a skill's targets once the enemy phase ends. */
const AIM_DELAY = 800;

/**
 * The threat, hover and skill-aim state of a battle: whether the Threats
 * button shows every enemy's plan, what hovering a unit reveals and which
 * units the skill under the cursor can reach. The selected target and the turn come in.
 */
export function useThreatPreview(
  run: Run,
  target: string,
  { current, selectedEnemy }: TurnView,
  phasing: boolean,
) {
  const { t } = useT();
  // The Threats button shows every enemy's plan at once while hovered, focused or pinned.
  const [overButton, setOverButton] = useState(false);
  const [pinned, setPinned] = useState(false);
  // Hovering (or keyboard-focusing) a unit shows who threatens or helps whom.
  const [hovered, setHovered] = useState("");
  // Skill under the mouse or keyboard focus: its possible targets are outlined in yellow.
  // `live` is false for a cursor that was already resting there during the preview.
  const [aim, setAimState] = useState({ id: "", live: false });

  // While the enemy turns play, hovering shows nothing.
  const previewing = phasing;
  const hoverId = previewing ? "" : hovered;
  const hoveredEnemy = run.enemies.find(
    (unit) => unit.id === hoverId && unit.hp > 0,
  );
  const noteEnemy = hoveredEnemy ?? selectedEnemy;
  const noteIntent = run && noteEnemy ? enemyIntent(run, noteEnemy) : undefined;
  // A cursor resting on a skill when the preview ends outlines after a short delay;
  // entering a skill later is immediate.
  useEffect(() => {
    if (previewing) return;
    const timer = setTimeout(
      () => setAimState((a) => ({ ...a, live: true })),
      pace(AIM_DELAY),
    );
    return () => clearTimeout(timer);
  }, [previewing]);
  const setAim = (id: string) => setAimState({ id, live: !previewing });
  const showAll = overButton || pinned;
  const arrowEntries: IntentEntry[] = [];
  if (run.status === "combat")
    for (const enemy of run.enemies) {
      if (enemy.hp <= 0) continue;
      const intent = enemyIntent(run, enemy);
      if (!intent) continue;
      // Hovering an enemy shows its own plan; hovering anyone it attacks or helps shows it too.
      const related =
        hoverId !== "" &&
        (enemy.id === hoverId ||
          intent.targetId === hoverId ||
          intent.allyId === hoverId);
      if ((showAll && !phasing) || related) {
        const cat = run.party.find((unit) => unit.id === intent.targetId);
        const ally = run.enemies.find((unit) => unit.id === intent.allyId);
        const tag = cat
          ? {
              text: `→ ${t(cat.name)}`,
              friendly: false,
            }
          : ally
            ? {
                text: `→ ${t(ally.name)}`,
                friendly: true,
              }
            : undefined;
        arrowEntries.push({ enemyId: enemy.id, intent, tag });
      }
    }
  const markedIds = new Set(
    arrowEntries.flatMap(({ intent }) =>
      intent.targetId ? [intent.targetId] : [],
    ),
  );
  const hoverProps = (id: string) => ({
    onMouseEnter: () => !previewing && setHovered(id),
    onMouseLeave: () => setHovered(""),
    onFocus: () => !previewing && setHovered(id),
    onBlur: () => setHovered(""),
  });
  // Who the hovered skill can reach.
  const aimedIds = new Set<string>();
  const aimAbility = current?.abilities.find(
    (ability) => ability.id === (previewing || !aim.live ? "" : aim.id),
  );
  if (run.status === "combat" && current && aimAbility)
    abilityReach(run, aimAbility, target).forEach((unit) =>
      aimedIds.add(unit.id),
    );
  return {
    previewing,
    hoverProps,
    noteEnemy,
    noteIntent,
    arrowEntries,
    markedIds,
    aimedIds,
    setAim,
    threatsButton: {
      pressed: showAll,
      bind: {
        onMouseEnter: () => setOverButton(true),
        onMouseLeave: () => setOverButton(false),
        onFocus: () => setOverButton(true),
        onBlur: () => setOverButton(false),
        onClick: () => setPinned((p) => !p),
      },
    },
  };
}
