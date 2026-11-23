import { describeAbility } from "./abilityText";
import type { Ability } from "./game";

/** Name, tags and plain description of a skill; used in combat and in the field guide. */
export function AbilityHead({
  ability,
  power,
}: {
  ability: Ability;
  power: number;
}) {
  const info = describeAbility(ability, power);
  return (
    <>
      <span>
        {ability.name} · {ability.cost} AP
      </span>
      <span className="ability-tags">
        <span className={`ability-tag kind-${info.kind}`}>
          {info.kindLabel}
        </span>
        <span className="ability-tag">{info.targetLabel}</span>
      </span>
      <span className="ability-detail">{info.text}</span>
      {info.note && (
        <span className="ability-detail ability-note">{info.note}</span>
      )}
    </>
  );
}
