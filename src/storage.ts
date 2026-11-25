import { CATS, initialProgress, readProgress, type Progress } from "./game";

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
/** The last save the game could not read, kept before a fresh one replaces it. */
export const BACKUP_KEY = "catacomb-cats.progress.backup";
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
    const raw = localStorage.getItem(SAVE_KEY);
    const saved = readProgress(raw);
    if (saved) return saved;
    if (raw !== null) localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    /* Start fresh when storage is unavailable. */
  }
  return initialProgress();
}
/** Finished Runs, for tuning difficulty. It never leaves this browser. */
export const RUNS_KEY = "catacomb-cats.runs";
export interface RunRecord {
  id: string;
  expedition: string;
  party: string[];
  /** Room where the Run ended, from 0. */
  room: number;
  won: boolean;
}
const isRecord = (x: unknown): x is RunRecord => {
  const r = x as RunRecord | null;
  return (
    typeof r?.id === "string" &&
    typeof r.expedition === "string" &&
    Array.isArray(r.party) &&
    r.party.every((id) => typeof id === "string") &&
    Number.isInteger(r.room) &&
    typeof r.won === "boolean"
  );
};
const records = (x: unknown) => (Array.isArray(x) ? x.filter(isRecord) : []);
export function loadRunLog(): RunRecord[] {
  try {
    return records(JSON.parse(localStorage.getItem(RUNS_KEY) ?? "[]"));
  } catch {
    return [];
  }
}
export function storeRunLog(log: RunRecord[]) {
  try {
    // shortcut: keeps the last 1000 Runs; raise it if older history matters.
    localStorage.setItem(RUNS_KEY, JSON.stringify(log.slice(-1000)));
  } catch {
    /* The record is only a convenience; the progress is what matters. */
  }
}
/** Adds a won or lost Run to the record, once. */
export function recordRun(run: {
  id: string;
  expedition: string;
  party: { id: string }[];
  room: number;
  status: string;
}) {
  if (run.status !== "victory" && run.status !== "defeat") return;
  const log = loadRunLog();
  if (log.some((r) => r.id === run.id)) return;
  storeRunLog([
    ...log,
    {
      id: run.id,
      expedition: run.expedition,
      party: run.party.map((u) => u.id),
      room: run.room,
      won: run.status === "victory",
    },
  ]);
}
/** The downloadable save file: the progress plus the run record. */
export const exportSave = (progress: Progress) =>
  JSON.stringify({ ...progress, runs: loadRunLog() });
/** What a save file holds, or null when its progress cannot be trusted. */
export function importSave(raw: string) {
  const progress = readProgress(raw);
  if (!progress) return null;
  const { runs } = JSON.parse(raw) as { runs?: unknown };
  return { progress, runs: runs === undefined ? null : records(runs) };
}
