import { CATS, initialProgress, parseProgress, type Progress } from "./game";

import { EXPEDITIONS } from "./expeditions";

declare global {
  interface Window {
    /** Optional fixed seed so browser tests get reproducible enemy marks. */
    __CATACOMB_SEED__?: number;
    /** Browser tests: "off" disables critical hits, a number fixes the chance. */
    __CATACOMB_CRIT__?: "off" | number;
    /** Browser tests: removes the pauses of the battle animations. */
    __CATACOMB_FAST__?: boolean;
  }
}
/** A battle pause in milliseconds; zero when browser tests ask for speed. */
export const pace = (ms: number) => (window.__CATACOMB_FAST__ ? 0 : ms);
export const runSeed = () =>
  window.__CATACOMB_SEED__ ?? crypto.getRandomValues(new Uint32Array(1))[0]!;
export const runCrit = () => window.__CATACOMB_CRIT__ ?? "on";
export const SAVE_KEY = "catacomb-cats.progress.v1";
export const PARTY_KEY = "catacomb-cats.party";
export const EXPEDITION_KEY = "catacomb-cats.expedition";
/** The last chosen Expedition, or the first when nothing valid was saved. */
export function loadExpedition(): string {
  try {
    const id = localStorage.getItem(EXPEDITION_KEY);
    if (EXPEDITIONS.some((e) => e.id === id)) return id!;
  } catch {
    /* Fall back to the first Expedition. */
  }
  return EXPEDITIONS[0]!.id;
}
const defaultParty = () => CATS.slice(0, 3).map((cat) => cat.id);
/** The last chosen party, or the default when nothing valid was saved. */
export function loadParty(): string[] {
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
export function loadProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem(SAVE_KEY));
  } catch {
    return initialProgress();
  }
}
