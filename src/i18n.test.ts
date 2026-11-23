import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ES } from "./es";
import { RULES, engineTemplate, translateEngine } from "./engineText";
import {
  CATS,
  INTENT_LABELS,
  ITEMS,
  REVIVE_ABILITY,
  SIGNATURE_ABILITIES,
  abilityTargetUnavailableReason,
  abilityUnavailableReason,
  act,
  createRun,
  currentUnit,
  endTurn,
  initialProgress,
  nextRoom,
  type Progress,
  type Run,
} from "./game";
import { PLURAL_WORDS, identityT, makeT } from "./i18n";
import {
  HEARTH_TRACK,
  TRAINING_TRACKS,
  getDifficulty,
  nextHearthDescription,
  nextTrainingDescription,
} from "./progression";
import { TUTORIAL_STEPS } from "./tutorialSteps";
import {
  ROOM_NAMES,
  ROOM_PATH,
  difficultyDescription,
  difficultyLabel,
  nextHearthText,
  nextTrainingText,
} from "./uiText";

const es = makeT("es");

/** Every string literal that is a direct argument of a t(...) call in the sources. */
function literalKeys(): Map<string, string> {
  const found = new Map<string, string>();
  const dir = join(__dirname);
  const files = readdirSync(dir).filter(
    (file) =>
      /\.tsx?$/.test(file) &&
      !/\.test\.tsx?$/.test(file) &&
      file !== "i18n.ts" &&
      file !== "engineText.ts",
  );
  for (const file of files) {
    const text = readFileSync(join(dir, file), "utf8");
    const call = /(?<![\w.])t\(/g;
    let match: RegExpExecArray | null;
    while ((match = call.exec(text))) {
      let depth = 1;
      let i = match.index + match[0].length;
      while (i < text.length && depth > 0) {
        const ch = text[i]!;
        if (ch === '"') {
          let j = i + 1;
          let value = "";
          while (text[j] !== '"') {
            if (text[j] === "\\") j++;
            value += text[j];
            j++;
          }
          if (depth === 1 && value !== "") found.set(value, file);
          i = j;
        } else if (ch === "`") {
          let j = i + 1;
          while (text[j] !== "`") j++;
          i = j;
        } else if ("([{".includes(ch)) depth++;
        else if (")]}".includes(ch)) depth--;
        i++;
      }
    }
  }
  return found;
}
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
/** Terms that are the same in both languages. */
const SAME = new Set([
  "FAQ",
  "Tutorial",
  "XP",
  "Miso",
  "Luna",
  "Pip",
  "Mei",
  "Ember",
  "CATACOMB CATS",
  "{n}",
  "{1}",
]);

describe("Spanish dictionary", () => {
  it("covers every literal t(...) key used in the interface", () => {
    const missing = [...literalKeys()].filter(([key]) => !(key in ES));
    expect(missing.map(([key, file]) => `${file}: ${key}`)).toEqual([]);
  });
  it("covers names, labels, training, Hearth, rooms and plurals", () => {
    const wanted = new Set<string>();
    for (const cat of CATS) {
      wanted.add(cat.role);
      for (const a of cat.abilities) wanted.add(a.name);
    }
    for (const a of [...Object.values(SIGNATURE_ABILITIES), REVIVE_ABILITY])
      wanted.add(a.name);
    for (const item of ITEMS) wanted.add(item);
    for (const label of Object.values(INTENT_LABELS)) wanted.add(label);
    for (const name of [...ROOM_NAMES, ...ROOM_PATH]) wanted.add(name);
    for (const rows of Object.values(TRAINING_TRACKS))
      for (const row of rows) {
        wanted.add(row.title);
        wanted.add(row.description);
      }
    for (const row of HEARTH_TRACK) {
      wanted.add(row.title);
      wanted.add(row.description);
    }
    for (const word of PLURAL_WORDS) {
      wanted.add(`{n} ${word}`);
      wanted.add(`{n} ${word}s`);
    }
    for (const [, template] of RULES) wanted.add(template);
    for (const step of TUTORIAL_STEPS) {
      wanted.add(step.title);
      wanted.add(step.body);
    }
    expect([...wanted].filter((key) => !(key in ES))).toEqual([]);
  });
  it("covers every enemy that can appear in an expedition", () => {
    const names = new Set<string>();
    const progress: Progress = {
      ...initialProgress(),
      wins: 12,
      spentGold: 3000,
      xp: 1500,
    };
    let run = createRun(progress, ["miso", "luna", "pip"]);
    for (let room = 0; room < 3; room++) {
      run.enemies.forEach((e) => names.add(e.name));
      run.enemies.forEach((e) => (e.hp = 0));
      run.enemies[0]!.hp = 1;
      run.enemies[0]!.armor = run.enemies[0]!.guard = 0;
      run = act(run, "strike", "e0");
      if (run.status === "reward") run = nextRoom(run);
    }
    expect(names.size).toBeGreaterThanOrEqual(8);
    expect([...names].filter((name) => !(name in ES))).toEqual([]);
  });
  it("keeps the same placeholders as the English text", () => {
    const bad = Object.entries(ES).filter(
      ([key, value]) =>
        JSON.stringify(placeholders(key)) !==
        JSON.stringify(placeholders(value)),
    );
    expect(bad.map(([key]) => key)).toEqual([]);
  });
  it("never leaves a translation identical to its English key", () => {
    const same = Object.entries(ES).filter(
      ([key, value]) => key === value && !SAME.has(key),
    );
    expect(same.map(([key]) => key)).toEqual([]);
  });
});

describe("translated helpers match the English rules text", () => {
  it("builds the same English difficulty text as the engine", () => {
    for (let wins = 0; wins <= 14; wins++) {
      const d = getDifficulty({
        wins,
        xp: wins * 90,
        generalLevel: Math.min(8, wins),
        catLevels: { miso: Math.min(8, wins), pip: Math.min(8, wins) },
      });
      expect(difficultyLabel(d, identityT)).toBe(d.label);
      expect(difficultyDescription(d, identityT)).toBe(d.description);
    }
  });
  it("builds the same English training and Hearth lines", () => {
    for (const cat of Object.keys(TRAINING_TRACKS))
      for (let rank = 0; rank <= 8; rank++)
        expect(nextTrainingText(cat, rank, identityT)).toBe(
          nextTrainingDescription(cat, rank),
        );
    for (let rank = 0; rank <= 8; rank++)
      expect(nextHearthText(rank, identityT)).toBe(nextHearthDescription(rank));
  });
  it("renders Spanish for the lobby helpers", () => {
    const d = getDifficulty({ wins: 3, xp: 0, catLevels: { miso: 8, pip: 1 } });
    expect(difficultyLabel(d, es)).toBe("Ascensión 3");
    expect(nextTrainingText("miso", 0, es)).toBe(
      "Siguiente rango 1 · Patas robustas: +3 PV máx.",
    );
    expect(nextHearthText(0, es)).toContain(
      "Siguiente rango 1 · Brasas cálidas",
    );
  });
});

/** Plays complete expeditions and collects every log line and refusal reason. */
function collectEngineText(): Set<string> {
  const texts = new Set<string>();
  const trained: Progress = {
    ...initialProgress(),
    generalLevel: 8,
    catLevels: { miso: 8, luna: 8, clover: 8, pip: 8, ember: 8 },
    wins: 6,
    spentGold: 1200,
    xp: 900,
  };
  const parties = [
    ["miso", "luna", "clover"],
    ["pip", "ember", "clover"],
    ["luna", "ember", "miso"],
  ];
  for (const progress of [initialProgress(), { ...trained, generalLevel: 3 }])
    for (const party of parties)
      for (let seed = 1; seed <= 6; seed++) {
        let run: Run = createRun(progress, party, seed);
        for (let step = 0; step < 400; step++) {
          run.log.forEach((line) => texts.add(line));
          if (run.status === "reward") {
            run = nextRoom(run);
            continue;
          }
          if (run.status !== "combat") break;
          const actor = currentUnit(run)!;
          const ids = [...run.party, ...run.enemies].map((u) => u.id);
          for (const ability of actor.abilities) {
            const reason = abilityUnavailableReason(run, ability);
            if (reason) texts.add(reason);
            for (const id of ids) {
              const why = abilityTargetUnavailableReason(run, ability, id);
              if (why) texts.add(why);
            }
          }
          let next = run;
          const usable = actor.abilities
            .filter((a) => !abilityUnavailableReason(run, a))
            .reverse();
          for (const ability of usable) {
            const target = ids.find(
              (id) =>
                !abilityTargetUnavailableReason(run, ability, id) &&
                (ability.target === "enemy"
                  ? run.enemies.some((e) => e.id === id)
                  : ability.target === "self" ||
                      ability.target === "all-enemies" ||
                      ability.target === "all-allies"
                    ? id === actor.id
                    : true),
            );
            if (!target) continue;
            next = act(run, ability.id, target);
            if (next !== run) break;
          }
          run = next === run ? endTurn(run) : next;
        }
        run.log.forEach((line) => texts.add(line));
      }
  return texts;
}
describe("engine messages", () => {
  const texts = collectEngineText();
  it("collects a wide variety of log lines and reasons", () => {
    expect(texts.size).toBeGreaterThan(60);
  });
  it("matches a translation rule for every message the engine writes", () => {
    const unmatched = [...texts].filter((text) => !engineTemplate(text));
    expect(unmatched).toEqual([]);
  });
  it("translates each message into Spanish without leaving English words", () => {
    const english =
      /\b(hits|heals|gains|uses|damage|shield|turns?|Guard blocked|passes|rises|revives|curses|reflects|recovers|reservoir|taunts)\b/;
    const stillEnglish = [...texts]
      .map((text) => [text, translateEngine(es, text)] as const)
      .filter(([, spanish]) => english.test(spanish));
    expect(stillEnglish.map(([text]) => text)).toEqual([]);
  });
  it("translates a sample log line with enemy and skill names", () => {
    expect(
      translateEngine(
        es,
        "Crypt rat hits Mei: 5 damage (5 attack power, 0 armor, 0 Guard blocked, 0 Ice Ward blocked; 24/29 HP).",
      ),
    ).toContain("Rata de cripta");
    expect(translateEngine(es, "Pip uses Claw strike.")).toBe(
      "Pip usa Zarpazo.",
    );
    expect(translateEngine(es, "Cooldown: ready in 2 turns")).toBe(
      "Enfriamiento: listo en 2 turnos",
    );
  });
});
