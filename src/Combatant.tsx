import { useId, type ReactNode } from "react";
import { Sprite } from "./Sprite";
import { UnitEffects } from "./UnitEffects";
import { useT } from "./i18n";
import type { Unit } from "./game";
import type { useCombatFeedback } from "./useCombatFeedback";

/** One unit's card on the battlefield: sprite, status badges, HP and the target button. */
export function Combatant({
  unit,
  units,
  taunting,
  sprite,
  turn = "",
  targeted,
  marked,
  aimed,
  feedback,
  hover,
  disabled,
  onTarget,
  children,
}: {
  unit: Unit;
  units: Unit[];
  taunting: boolean;
  /** Key of the sprite: a cat's id or an enemy's name. */
  sprite: string;
  /** "active" for the cat whose turn it is, "acting" for the enemy playing its turn. */
  turn?: "active" | "acting" | "";
  targeted: boolean;
  marked: boolean;
  aimed: boolean;
  feedback: ReturnType<typeof useCombatFeedback>;
  hover: (id: string) => object;
  disabled: boolean;
  onTarget: () => void;
  /** Extra overlay, like the turn banner. */
  children?: ReactNode;
}) {
  const { t } = useT();
  const hp = feedback.shownHp(unit);
  const healthId = useId();
  return (
    <article
      data-unit={unit.id}
      className={`combatant ${turn} ${hp <= 0 ? "dead" : ""} ${targeted ? "targeted" : ""} ${marked ? "marked" : ""} ${unit.guard > 0 && unit.hp > 0 ? "guarded" : ""} ${aimed ? "aimed" : ""} ${feedback.flashClass(unit.id)}`}
      {...feedback.flashProps(unit.id)}
      {...hover(unit.id)}
    >
      {feedback.critPop(unit.id)}
      {children}
      <UnitEffects unit={unit} units={units} taunting={taunting} />
      <button
        className="unit-target"
        aria-label={t("Target {name}", { name: t(unit.name) })}
        aria-describedby={healthId}
        aria-pressed={targeted}
        onClick={onTarget}
        disabled={disabled}
      >
        <Sprite id={sprite} />
      </button>
      <h3>{t(unit.name)}</h3>
      <div className="health">
        <span style={{ width: `${(hp / unit.maxHp) * 100}%` }} />
      </div>
      <span className="health-value" id={healthId}>
        {hp} / {unit.maxHp} {t("HP")}
      </span>
    </article>
  );
}
