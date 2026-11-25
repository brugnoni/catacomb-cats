import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Faq } from "./Faq";

import { LanguageScreen } from "./LanguageScreen";
import { Lobby } from "./Lobby";
import { SkinsContext } from "./Sprite";
import { Battle } from "./Battle";
import { useTutorial } from "./useTutorial";
import {
  EXPEDITION_KEY,
  PARTY_KEY,
  SAVE_KEY,
  loadExpedition,
  loadParty,
  loadProgress,
  recordRun,
  runCrit,
  runSeed,
} from "./storage";
import { TutorialCoach, TutorialOffer } from "./Tutorial";
import { preloadArt } from "./preload";

import { playableExpedition } from "./expeditions";

import {
  LangContext,
  loadLang,
  makeT,
  saveLang,
  useT,
  type Lang,
} from "./i18n";
import {
  createRun,
  nextRoom,
  claimRewards,
  type Run,
  type Progress,
} from "./game";

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
  const [expedition, setExpedition] = useState(loadExpedition);
  useEffect(() => {
    try {
      localStorage.setItem(EXPEDITION_KEY, expedition);
    } catch {
      /* The Expedition simply is not remembered. */
    }
  }, [expedition]);
  // A saved choice that is locked (for example after a save reset) falls back to the first Expedition.
  const open = playableExpedition(progress, expedition).id;
  const [run, setRun] = useState<Run | null>(null);
  // Battle remounts for every room; its scroll position is put back before paint.
  const keptScroll = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (keptScroll.current === null) return;
    window.scrollTo(0, keptScroll.current);
    keptScroll.current = null;
  }, [run?.room]);
  const [notice, setNotice] = useState("");
  const [showFaq, setShowFaq] = useState(false);
  // True while the battle art loads before a run begins.
  const [entering, setEntering] = useState(false);
  const startRun = async (make: () => Run, after?: () => void) => {
    if (entering) return;
    setEntering(true);
    await preloadArt();
    setEntering(false);
    setRun(make());
    after?.();
  };
  const {
    offer,
    locked,
    turnLocked,
    tutorial,
    practice,
    stepIndex,
    startTutorial,
    endTutorial,
    nextTutorialStep,
  } = useTutorial({
    run,
    showFaq,
    onCloseFaq: () => setShowFaq(false),
    startRun,
    onLeavePractice: () => setRun(null),
  });
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
  // Rewards are banked the moment the boss falls, not when the player leaves.
  const updateRun = (next: Run) => {
    setRun(next);
    if (practice) return;
    recordRun(next);
    if (next.status === "victory") storeProgress(claimRewards(progress, next));
  };
  const choose = (id: string) =>
    setParty((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : previous.length < 3
          ? [...previous, id]
          : previous,
    );
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
      // Stored again so a failed save at victory is retried and reported.
      storeProgress(progress);
    } else
      setNotice(t("The expedition is over. Your permanent upgrades are safe."));
    setRun(null);
  };
  return (
    <SkinsContext.Provider value={progress.skins}>
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
            expedition={open}
            onExpedition={setExpedition}
            entering={entering}
            onChoose={choose}
            onStore={storeProgress}
            onNotice={setNotice}
            onEnter={() => {
              setNotice("");
              void startRun(() =>
                createRun(progress, party, runSeed(), {
                  crit: runCrit(),
                  expedition: open,
                }),
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
              locked={locked}
              turnLocked={turnLocked}
              onRun={updateRun}
              onLeave={leave}
              onContinue={() => {
                if (practice) endTutorial("done");
                else {
                  keptScroll.current = window.scrollY;
                  setRun(nextRoom(run));
                }
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
    </SkinsContext.Provider>
  );
}
