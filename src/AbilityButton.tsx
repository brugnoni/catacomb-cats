import { AbilityHead } from "./AbilityCard";
import { cooldownText, describeAbility } from "./abilityText";
import { translateEngine } from "./engineText";
import { useT } from "./i18n";
import {
  abilityCost,
  abilityLimit,
  abilityPower,
  abilityTargetUnavailableReason,
  abilityUnavailableReason,
  abilityUses,
  act,
  cooldownRemaining,
  damagePreview,
  type Ability,
  type Run,
  type Unit,
} from "./game";

/** One skill of the cat whose turn it is: description, damage preview, limits and cooldown. */
export function AbilityButton({
  run,
  current,
  ability,
  target,
  locked,
  onAim,
  onAct,
}: {
  run: Run;
  current: Unit;
  ability: Ability;
  /** The unit chosen on the field, for skills that need one. */
  target: string;
  /** True while the opening hits play, when nothing can be cast. */
  locked: boolean;
  /** Reports the skill under the mouse or focus ("" when none). */
  onAim: (abilityId: string) => void;
  onAct: (next: Run, ability: Ability) => void;
}) {
  const { t } = useT();

  const limit = ability.roomLimit ?? abilityLimit(ability);
  const uses = ability.roomLimit
    ? (run.roomUses[`${current.id}:${ability.id}`] ?? 0)
    : abilityUses(run, ability.id);
  const power = abilityPower(run, current, ability);
  const cooldown = cooldownRemaining(current, ability);
  const actionTarget =
    ability.target === "enemy" ||
    ability.target === "ally" ||
    ability.target === "fallen-ally"
      ? target
      : current.id;
  const reason =
    abilityUnavailableReason(run, ability) ??
    abilityTargetUnavailableReason(run, ability, actionTarget);
  const previewEnemy = run.enemies.find(
    (unit) => unit.id === actionTarget && unit.hp > 0,
  );
  const preview =
    previewEnemy && ability.target === "enemy"
      ? damagePreview(run, current, ability, previewEnemy)
      : undefined;
  const info = describeAbility(ability, power, t);
  const usageLabel = ability.roomLimit ? t("this room") : t("this turn");
  return (
    <span
      className="ability-slot"
      key={ability.id}
      onMouseEnter={() => onAim(ability.id)}
      onMouseLeave={() => onAim("")}
      onFocus={() => onAim(ability.id)}
      onBlur={() => onAim("")}
    >
      <button
        data-testid="ability"
        title={reason ? translateEngine(t, reason) : info.text}
        disabled={Boolean(reason) || locked}
        onClick={() => onAct(act(run, ability.id, actionTarget), ability)}
      >
        <AbilityHead
          ability={{ ...ability, cost: abilityCost(run, ability) }}
          power={power}
        />
        {preview && (
          <span className="ability-detail damage-preview">
            {preview.damage > 0
              ? t("Deals {n} · {left} HP left", {
                  n: preview.damage,
                  left: preview.remainingHp,
                })
              : t("Deals 0 damage")}
            {preview.armor + preview.blocked + preview.iceBlocked > 0 &&
              ` (${t("{n} blocked", { n: preview.armor + preview.blocked + preview.iceBlocked })})`}
          </span>
        )}
        {reason && (target || cooldown > 0) && (
          <span className="ability-detail ability-blocked">
            {translateEngine(t, reason)}
          </span>
        )}
        {ability.cooldownTurns ? (
          <span className="ability-cooldown">
            {cooldownText(ability.cooldownTurns, cooldown, t)}
          </span>
        ) : null}
        <span className="ability-usage">
          {Number.isFinite(limit)
            ? t("{left}/{limit} uses left {when}", {
                left: Math.max(0, limit - uses),
                limit,
                when: usageLabel,
              })
            : t("AP limited")}
        </span>
      </button>
    </span>
  );
}
