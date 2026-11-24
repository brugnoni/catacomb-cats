import { useEffect, useState } from "react";

import { Faq } from "./Faq";

import { LanguageScreen } from "./LanguageScreen";
import { Lobby } from "./Lobby";
import { Battle } from "./Battle";
import { TutorialCoach, TutorialOffer } from "./Tutorial";
import { preloadArt } from "./preload";
import {
  TUTORIAL_STEPS,
  loadTutorialFlag,
  practiceRun,
  saveTutorialFlag,
} from "./tutorialSteps";

import {
  LangContext,
  loadLang,
  makeT,
  saveLang,
  useT,
  type Lang,
} from "./i18n";
import {
  CATS,
  initialProgress,
  createRun,
  nextRoom,
  claimRewards,
  parseProgress,
  type Run,
  type Progress,
} from "./game";

declare global {
  interface Window {
    /** Optional fixed seed so browser tests get reproducible enemy marks. */
    __CATACOMB_SEED__?: number;
    /** Browser tests: "off" disables critical hits, a number fixes the chance. */
    __CATACOMB_CRIT__?: "off" | number;
  }
}
const runSeed = () =>
  window.__CATACOMB_SEED__ ?? crypto.getRandomValues(new Uint32Array(1))[0]!;
const runCrit = () => window.__CATACOMB_CRIT__ ?? "on";
const SAVE_KEY = "catacomb-cats.progress.v1";
const PARTY_KEY = "catacomb-cats.party";
const defaultParty = () => CATS.slice(0, 3).map((cat) => cat.id);
/** The last chosen party, or the default when nothing valid was saved. */
function loadParty(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PARTY_KEY) ?? "null");
    if (
      Array.isArray(raw) &&
      raw.length <= 3 &&
      new Set(raw).size === raw.length &&
      raw.every((id) => CATS.some((cat) => cat.id === id))
    )
      return raw as string[];
  } catch {
    /* Fall back to the default party. */
  }
  return defaultParty();
}
function loadProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem(SAVE_KEY));
  } catch {
    return initialProgress();
  }
}

export default function App() {
  const [lang, setLang] = useState<Lang | null>(loadLang);
  const pick = (next: Lang) => {
    saveLang(next);
    setLang(next);
  };
  useEffect(() => {
    document.documentElement.lang = lang ?? "en";
  }, [lang]);
  if (lang === null) return <LanguageScreen onPick={pick} />;
  return (
    <LangContext.Provider value={{ lang, t: makeT(lang) }}>
      <Game onLanguage={pick} />
    </LangContext.Provider>
  );
}
function Game({ onLanguage }: { onLanguage: (lang: Lang) => void }) {
  const { lang, t } = useT();
  const [progress, setProgress] = useState(loadProgress);
  const [party, setParty] = useState<string[]>(loadParty);
  useEffect(() => {
    try {
      localStorage.setItem(PARTY_KEY, JSON.stringify(party));
    } catch {
      /* The party simply is not remembered. */
    }
  }, [party]);
  const [run, setRun] = useState<Run | null>(null);
  const [notice, setNotice] = useState("");
  const [showFaq, setShowFaq] = useState(false);
  // Tutorial: asked once on the first visit, always reachable from the top bar.
  const [offer, setOffer] = useState(() => loadTutorialFlag() === null);
  const [tutorial, setTutorial] = useState<{
    step: number;
    mark: string;
  } | null>(null);
  const [practice, setPractice] = useState(false);
  // True while the battle art loads before a run begins.
  const [entering, setEntering] = useState(false);
  const startRun = async (make: () => Run, after?: () => void) => {
    setEntering(true);
    await preloadArt();
    setEntering(false);
    beginRun(make());
    after?.();
  };
  const beginRun = (next: Run) => {
    setRun(next);
  };
  const storeProgress = (next: Progress) => {
    setProgress(next);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      setNotice(
        t(
          "Your browser could not save progress. Keep this tab open to continue.",
        ),
      );
    }
  };
  const choose = (id: string) =>
    setParty((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : previous.length < 3
          ? [...previous, id]
          : previous,
    );
  const endTutorial = (flag: "done" | "skipped") => {
    saveTutorialFlag(flag);
    setOffer(false);
    setTutorial(null);
    if (practice) {
      setPractice(false);
      setRun(null);
    }
  };
  const startTutorial = () => {
    setShowFaq(false);
    setOffer(false);
    if (practice) {
      endTutorial("skipped");
      return;
    }
    setTutorial({ step: 0, mark: "" });
  };
  const leave = () => {
    if (practice) {
      endTutorial("skipped");
      return;
    }
    if (run?.status === "victory") {
      setNotice(
        t(
          "Expedition complete. Your treasures and experience are safely home.",
        ),
      );
      storeProgress(claimRewards(progress, run));
    } else
      setNotice(t("The expedition is over. Your permanent upgrades are safe."));
    setRun(null);
  };
  const currentId = run?.order[run.turn];
  const turnMark = run ? `${run.round}:${currentId}` : "";
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
  return (
    <>
      <div className={`app ${run ? "battle-mode" : "lobby-mode"}`}>
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              ✣
            </span>{" "}
            CATACOMB CATS <small>{t("THE HOLLOW BELOW")}</small>
          </div>
          <div className="top-meta">
            <span className="location-tag">
              {run
                ? t("DEPTH 0{n}", { n: run.room + 1 })
                : t("CAMP / THE BURROW")}
            </span>
            <span className="currency">
              {progress.gold} {t("gold")}
            </span>
            <span>{progress.xp} XP</span>
            <label className="lang-switch">
              <span>{t("Language")}</span>
              <select
                aria-label={t("Language")}
                value={lang}
                onChange={(event) => onLanguage(event.target.value as Lang)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
            <button
              className="faq-nav quiet"
              disabled={Boolean(run) && !practice}
              title={
                run && !practice
                  ? t("Finish or retreat from the expedition first.")
                  : undefined
              }
              onClick={startTutorial}
            >
              {t("Tutorial")}
            </button>
            <button
              className="faq-nav quiet"
              aria-expanded={showFaq}
              onClick={() => setShowFaq(!showFaq)}
            >
              FAQ
            </button>
          </div>
        </header>
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {showFaq && <Faq onClose={() => setShowFaq(false)} />}
        {!showFaq && !run && (
          <Lobby
            progress={progress}
            party={party}
            entering={entering}
            onChoose={choose}
            onStore={storeProgress}
            onNotice={setNotice}
            onEnter={() => {
              setNotice("");
              void startRun(() =>
                createRun(progress, party, runSeed(), { crit: runCrit() }),
              );
            }}
          />
        )}
        {run && (
          // Kept mounted behind the field guide so the selection and previews survive.
          <div style={{ display: showFaq ? "none" : "contents" }}>
            <Battle
              key={`${run.id}:${run.room}`}
              run={run}
              practice={practice}
              onRun={setRun}
              onLeave={leave}
              onContinue={() => {
                if (practice) endTutorial("done");
                else beginRun(nextRoom(run));
              }}
            />
          </div>
        )}
        <footer className="footer">
          <span>
            CATACOMB CATS <span className="footer-dot">·</span> {t("CHAPTER I")}
          </span>
          <span>
            {run ? t("NO WAY OUT BUT THROUGH") : t("THE FIRE IS STILL BURNING")}
          </span>
          <span>{t("LOCAL SAVE")}</span>
        </footer>
      </div>
      {entering && (
        <div className="entering-overlay" role="status">
          {t("Entering the dungeon…")}
        </div>
      )}
      {offer && !run && !showFaq && !tutorial && (
        <TutorialOffer
          onStart={startTutorial}
          onLater={() => endTutorial("skipped")}
        />
      )}
      {tutorial && !showFaq && (
        <TutorialCoach
          index={stepIndex}
          waiting={false}
          onNext={nextTutorialStep}
          onSkip={() => endTutorial("skipped")}
        />
      )}
    </>
  );
}
