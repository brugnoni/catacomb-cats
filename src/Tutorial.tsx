import { useT } from "./i18n";
import { TUTORIAL_STEPS, type TutorialStep } from "./tutorialSteps";

/** First-visit question; the same tutorial is always available from the top bar. */
export function TutorialOffer({
  onStart,
  onLater,
}: {
  onStart: () => void;
  onLater: () => void;
}) {
  const { t } = useT();
  return (
    <div className="tutorial-offer" role="dialog" aria-label={t("New here?")}>
      <div className="tutorial-offer-card">
        <h2>{t("New here?")}</h2>
        <p>
          {t(
            "Learn the basics in a few minutes: your cats, training, gold and a short practice battle.",
          )}
        </p>
        <div className="language-options">
          <button className="primary" onClick={onStart}>
            {t("Start tutorial")}
          </button>
          <button onClick={onLater}>{t("Not now")}</button>
        </div>
        <small>{t("You can open it again from the Tutorial button.")}</small>
      </div>
    </div>
  );
}

/** The guide panel: it never blocks the game, it only points at things. */
export function TutorialCoach({
  index,
  waiting,
  onNext,
  onSkip,
}: {
  index: number;
  /** True while a gated step still needs the player to act. */
  waiting: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { t } = useT();
  const step: TutorialStep = TUTORIAL_STEPS[index]!;
  const label =
    step.next === "practice"
      ? t("Start practice battle")
      : step.next === "finish"
        ? t("Finish tutorial")
        : t("Next");
  return (
    <aside className="tutorial-coach" aria-label={t("Tutorial")}>
      <span className="tutorial-step">
        {t("Step {n} of {total}", {
          n: index + 1,
          total: TUTORIAL_STEPS.length,
        })}
      </span>
      <h2>{t(step.title)}</h2>
      <p>{t(step.body)}</p>
      <div className="tutorial-actions">
        <button className="quiet" onClick={onSkip}>
          {t("Skip tutorial")}
        </button>
        {step.gate ? (
          <span className="tutorial-wait">{t("Do it to continue")}</span>
        ) : (
          <button className="primary" onClick={onNext} disabled={waiting}>
            {label}
          </button>
        )}
      </div>
    </aside>
  );
}
