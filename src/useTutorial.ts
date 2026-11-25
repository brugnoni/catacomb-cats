import { useEffect, useState } from "react";
import type { Run } from "./game";
import {
  TUTORIAL_STEPS,
  loadTutorialFlag,
  practiceRun,
  saveTutorialFlag,
} from "./tutorialSteps";

/**
 * The tutorial: the first-visit question, the step the player is on, the practice
 * battle and the highlighted spot. The practice battle is an ordinary run that the
 * parent starts and drops through the callbacks, so progress is never touched.
 */
export function useTutorial({
  run,
  showFaq,
  onCloseFaq,
  startRun,
  onLeavePractice,
}: {
  run: Run | null;
  showFaq: boolean;
  onCloseFaq: () => void;
  startRun: (make: () => Run, after?: () => void) => Promise<void>;
  /** Drops the practice battle and returns to the lobby. */
  onLeavePractice: () => void;
}) {
  // Asked once on the first visit, always reachable from the top bar.
  const [offer, setOffer] = useState(() => loadTutorialFlag() === null);
  const [tutorial, setTutorial] = useState<{
    step: number;
    mark: string;
  } | null>(null);
  const [practice, setPractice] = useState(false);
  const endTutorial = (flag: "done" | "skipped") => {
    saveTutorialFlag(flag);
    setOffer(false);
    setTutorial(null);
    if (practice) {
      setPractice(false);
      onLeavePractice();
    }
  };
  const startTutorial = () => {
    onCloseFaq();
    setOffer(false);
    if (practice) {
      endTutorial("skipped");
      return;
    }
    setTutorial({ step: 0, mark: "" });
  };
  const turnMark = run ? `${run.round}:${run.order[run.turn]}` : "";
  // A step that asks the player to act is skipped as soon as they have done it.
  const gateDone = (step: (typeof TUTORIAL_STEPS)[number]) =>
    !!run &&
    (step.gate === "attack"
      ? run.ap < run.maxAp
      : step.gate === "pass"
        ? turnMark !== tutorial?.mark
        : step.gate === "reward"
          ? run.status === "reward"
          : false);
  let stepIndex = tutorial?.step ?? 0;
  while (
    tutorial &&
    TUTORIAL_STEPS[stepIndex]?.gate &&
    stepIndex < TUTORIAL_STEPS.length - 1 &&
    gateDone(TUTORIAL_STEPS[stepIndex]!)
  )
    stepIndex++;
  const tutorialStep = tutorial ? TUTORIAL_STEPS[stepIndex] : undefined;
  const nextTutorialStep = () => {
    if (!tutorial || !tutorialStep) return;
    if (tutorialStep.next === "finish") {
      endTutorial("done");
      return;
    }
    if (tutorialStep.next === "practice") {
      void startRun(practiceRun, () => {
        setPractice(true);
        setTutorial({ step: stepIndex + 1, mark: "" });
      });
      return;
    }
    setTutorial({ step: stepIndex + 1, mark: turnMark });
  };
  // Outline what the current step is about.
  const spot = showFaq ? undefined : tutorialStep?.spot;
  useEffect(() => {
    if (!spot) return;
    const found = [...document.querySelectorAll(spot)];
    found.forEach((el) => el.classList.add("tutorial-spot"));
    found[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
    return () => found.forEach((el) => el.classList.remove("tutorial-spot"));
  }, [spot, run?.status, run?.room, stepIndex]);
  // Skills only work on the steps that ask for them, so the room cannot be won
  // before the last step; the turn button also works on the "pass" step.
  const inBattleStep = !!run && tutorialStep?.phase === "battle";
  const locked =
    inBattleStep &&
    tutorialStep?.gate !== "attack" &&
    tutorialStep?.gate !== "reward";
  const turnLocked = inBattleStep && !tutorialStep?.gate;
  return {
    offer,
    locked,
    turnLocked,
    tutorial,
    practice,
    stepIndex,
    startTutorial,
    endTutorial,
    nextTutorialStep,
  };
}
