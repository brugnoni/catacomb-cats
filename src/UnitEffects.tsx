import { useId, useState } from "react";
import type { Unit } from "./game";
import { plural } from "./abilityText";
type EffectKind =
  | "armor"
  | "guard"
  | "inspired"
  | "curse"
  | "reflect"
  | "taunt"
  | "ice"
  | "recovery"
  | "ambush";
function EffectIcon({ kind }: { kind: EffectKind }) {
  const paths: Record<EffectKind, string> = {
    armor: "M4 1H7V4H9V1H12V3H14V7H12V14H4V7H2V3H4Z M6 7V12H10V7Z",
    guard: "M3 1H13V9H11V12H9V14H7V12H5V9H3Z M5 3V8H7V11H9V8H11V3Z",
    inspired: "M7 0H9V5H11V7H16V9H11V11H9V16H7V11H5V9H0V7H5V5H7Z",
    curse: "M3 2H13V10H10V14H6V10H3Z M5 5V8H7V5Z M9 5V8H11V5Z M7 10V12H9V10Z",
    reflect:
      "M5 1H11V3H13V11H11V13H9V15H7V13H5V11H3V3H5Z M6 3V11H10V3Z M7 4H9V9H7Z",
    taunt: "M3 1H5V2H13V8H5V15H3Z M6 3V6H11V3Z",
    ice: "M7 0H9V5L12 2L14 4L10 8L14 12L12 14L9 11V16H7V11L4 14L2 12L6 8L2 4L4 2L7 5Z",
    recovery: "M6 1H10V6H15V10H10V15H6V10H1V6H6Z",
    ambush: "M11 0H15L11 6H14L4 16L6 9H2Z",
  };
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <path d={paths[kind]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
function Badge({
  kind,
  label,
  value,
  description,
}: {
  kind: EffectKind;
  label: string;
  value: string;
  description: string;
}) {
  const id = useId();
  const [pinned, setPinned] = useState(false);
  return (
    <span
      className={`effect-badge effect-${kind}`}
      data-pinned={pinned || undefined}
    >
      <button
        type="button"
        className="effect-icon"
        aria-label={`${label}: ${value}`}
        aria-describedby={id}
        onClick={() => setPinned(!pinned)}
        onBlur={() => setPinned(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setPinned(false);
            event.currentTarget.blur();
          }
        }}
      >
        <EffectIcon kind={kind} />
        <span className="effect-value" aria-hidden="true">
          {value}
        </span>
      </button>
      <span className="effect-tooltip" role="tooltip" id={id}>
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
    </span>
  );
}
export function UnitEffects({
  unit,
  taunting = false,
}: {
  unit: Unit;
  taunting?: boolean;
  units?: Unit[];
}) {
  const effects: {
    kind: EffectKind;
    label: string;
    value: string;
    description: string;
  }[] = [];
  if (unit.hp <= 0) return null;
  if (unit.armor > 0)
    effects.push({
      kind: "armor",
      label: "Armor",
      value: String(unit.armor),
      description: `Reduces each hit by ${unit.armor}. Armor-piercing attacks ignore it.`,
    });
  if (unit.guard > 0)
    effects.push({
      kind: "guard",
      label: "Guard",
      value: String(unit.guard),
      description: `Absorbs ${unit.guard} more damage. Lasts ${plural(unit.guardTurns, "turn")}.`,
    });
  if (unit.fury > 0)
    effects.push({
      kind: "inspired",
      label: "Inspired",
      value: `+${unit.fury}`,
      description: `+${unit.fury} to damage, healing and shields. Lasts ${plural(unit.furyTurns, "turn")}.`,
    });
  if (unit.curse > 0)
    effects.push({
      kind: "curse",
      label: "Curse",
      value: `−${unit.curse}`,
      description: `Damage, healing and shields are ${unit.curse} lower. Lasts ${plural(unit.curseTurns, "turn")}.`,
    });
  if (unit.reflect > 0)
    effects.push({
      kind: "reflect",
      label: "Reflect",
      value: String(unit.reflect),
      description: `Sends ${unit.reflect} damage back to whoever hurts this unit. Lasts ${plural(unit.reflectTurns, "turn")}.`,
    });
  if (unit.iceCharges > 0)
    effects.push({
      kind: "ice",
      label: "Ice Ward",
      value: String(unit.iceCharges),
      description: `Reduces the next ${plural(unit.iceCharges, "hit")} by ${unit.iceArmor}.`,
    });
  if (unit.reactiveHealCharges > 0)
    effects.push({
      kind: "recovery",
      label: "Healing response",
      value: String(unit.reactiveHealCharges),
      description: `Recovers ${unit.reactiveHeal} HP when ${unit.name} is hurt and survives. ${plural(unit.reactiveHealCharges, "use")} left this room.`,
    });
  if (unit.openingAttack > 0)
    effects.push({
      kind: "ambush",
      label: "Ambush",
      value: `+${unit.openingAttack}`,
      description: `The first damaging skill this room gets +${unit.openingAttack} damage.`,
    });
  if (taunting)
    effects.push({
      kind: "taunt",
      label: "Taunt",
      value: "active",
      description: `Enemy attacks target ${unit.name} until ${unit.name}'s next turn.`,
    });
  if (!effects.length) return null;
  return (
    <div className="unit-effects" aria-label={`Active effects on ${unit.name}`}>
      {effects.map((effect) => (
        <Badge key={effect.kind} {...effect} />
      ))}
    </div>
  );
}
