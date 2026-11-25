import { createRun, initialProgress, type Run } from "./game";

export const TUTORIAL_KEY = "catacomb-cats.tutorial";
export type TutorialFlag = "done" | "skipped";

export function loadTutorialFlag(): TutorialFlag | null {
  try {
    const value = localStorage.getItem(TUTORIAL_KEY);
    return value === "done" || value === "skipped" ? value : null;
  } catch {
    return null;
  }
}
export function saveTutorialFlag(flag: TutorialFlag) {
  try {
    localStorage.setItem(TUTORIAL_KEY, flag);
  } catch {
    /* It will simply be offered again next visit. */
  }
}

/** What the player must do before the tutorial moves on by itself. */
export type TutorialGate = "attack" | "pass" | "reward";
export interface TutorialStep {
  id: string;
  /** Lobby steps highlight the camp; battle steps run inside the practice battle. */
  phase: "lobby" | "battle";
  /** CSS selector of what to highlight. */
  spot: string;
  title: string;
  body: string;
  gate?: TutorialGate;
  /** What the Next button does on this step. */
  next?: "practice" | "finish";
}

/** English text is the translation key, like everywhere else in the game. */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    phase: "lobby",
    spot: ".roster",
    title: "Welcome to the Burrow",
    body: "This is your camp. You lead a company of five cats, and every expedition takes three of them underground. Choose who goes with Add to party or Remove from party. HP is a cat's health and INIT decides who acts first.",
  },
  {
    id: "training",
    phase: "lobby",
    spot: ".cat-card .train-button, .cat-card .equipment-label",
    title: "Training, gold and trinkets",
    body: "Gold buys training for one cat. Each rank improves its stats, and rank 3 unlocks a signature skill. A trinket gives one cat a small bonus. You earn gold by clearing rooms, but they are only banked when you beat the boss.",
  },
  {
    id: "xp",
    phase: "lobby",
    spot: ".xp-summary, .camp-upgrades",
    title: "XP, mastery and the Hearth",
    body: "XP is never spent: every 150 XP raises the mastery level of all your cats. The Hearth blessing on the right is bought with gold and helps every cat: more HP, power and critical chance, and a Second Wind that stands up the first cat to fall.",
  },
  {
    id: "rooms",
    phase: "lobby",
    spot: ".expedition-gate",
    title: "Rooms, boss and Threat",
    body: "An expedition has three chambers: two rooms and then the boss. After your first victory the Threat level grows as you get stronger, so enemies keep up with you. Press Start practice battle to try combat; nothing in it is saved.",
    next: "practice",
  },
  {
    id: "order",
    phase: "battle",
    spot: ".initiative",
    title: "Turn order",
    body: "Cats and enemies act one at a time, by initiative. The arrow over a unit marks whose turn it is, and the TURN ORDER bar shows who comes next.",
  },
  {
    id: "ap",
    phase: "battle",
    spot: ".round-counter",
    title: "Shared ability points",
    body: "Your whole team shares 6 ability points (AP) each round. Any cat can spend them on its turn, and every skill shows its cost. When they run out, the turn ends by itself.",
  },
  {
    id: "attack",
    phase: "battle",
    spot: ".battle-team.enemies",
    title: "Pick a target and attack",
    body: "Click an enemy to choose it, then press a skill such as Claw strike. Try it now.",
    gate: "attack",
  },
  {
    id: "skills",
    phase: "battle",
    spot: ".actions",
    title: "Skills",
    body: "Each skill says what it does (Damage, Heal, Shield, Buff or Utility) and who it reaches. Hover a skill to outline its targets in yellow. Skills have uses per turn, and a skill on cooldown shows a badge above its cat.",
  },
  {
    id: "pass",
    phase: "battle",
    spot: '[data-testid="end-turn"]',
    title: "Passing the turn",
    body: "When a cat is done, press the turn button. It says Pass to the next cat, and End turn for the last one, when the enemies act. Unspent AP stay for the next cat. Pass the turn now.",
    gate: "pass",
  },
  {
    id: "threats",
    phase: "battle",
    spot: ".battlefield",
    title: "Enemy threats",
    body: "At the start of each turn, threads show what each enemy will do: red attacks a cat, green helps an ally, violet curses. Hover an enemy or a cat to see them again. Shields, healing and Taunt change what hurts.",
  },
  {
    id: "win",
    phase: "battle",
    spot: ".battle-team.enemies",
    title: "Defeat the enemies",
    body: "Keep attacking and passing the turn until both enemies fall. Critical hits, misses and ready skills are announced over the cats as you play.",
    gate: "reward",
  },
  {
    id: "loot",
    phase: "battle",
    spot: ".result",
    title: "Loot and what comes next",
    body: "Clearing a room gives gold, XP and an item, but they are only banked when the boss falls. Practice rewards are not kept. You can open this tutorial again any time from the Tutorial button.",
    next: "finish",
  },
];

/** A safe, weak first room so a new player cannot lose while learning. */
export function practiceRun(): Run {
  const run = createRun(initialProgress(), ["miso", "luna", "pip"], 1);
  for (const enemy of run.enemies) {
    enemy.hp = enemy.maxHp = Math.round(enemy.maxHp * 0.6);
    enemy.abilities[0]!.power = 3;
  }
  return run;
}
