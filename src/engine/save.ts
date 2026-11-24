import { trainingCost } from "../progression";
import { EXPEDITIONS, rankCap } from "../expeditions";
import { type Progress, type Run } from "./model";
import { CATS, ITEMS, SKINS, initialProgress } from "./data";

export function claimRewards(progress: Progress, run: Run): Progress {
  if (run.status !== "victory" || progress.claimedRuns.includes(run.id))
    return progress;
  return {
    ...progress,
    claimedRuns: [...progress.claimedRuns, run.id].slice(-100),
    gold: progress.gold + run.gold,
    xp: progress.xp + run.xp,
    inventory: [...new Set([...progress.inventory, ...run.items])],
    expeditionWins: {
      ...progress.expeditionWins,
      [run.expedition]: (progress.expeditionWins[run.expedition] ?? 0) + 1,
    },
  };
}

export function upgradeCost(progress: Progress, catId?: string): number {
  return catId
    ? trainingCost(progress.catLevels[catId] ?? 0)
    : 20 + 20 * progress.generalLevel;
}

export function buyUpgrade(progress: Progress, catId?: string): Progress {
  if (catId && !CATS.some((c) => c.id === catId)) return progress;
  const rank = catId ? (progress.catLevels[catId] ?? 0) : progress.generalLevel;
  if (rank >= rankCap(progress)) return progress;
  const cost = upgradeCost(progress, catId);
  if (progress.gold < cost) return progress;
  return {
    ...progress,
    gold: progress.gold - cost,
    spentGold: progress.spentGold + cost,
    generalLevel: progress.generalLevel + (catId ? 0 : 1),
    catLevels: catId
      ? { ...progress.catLevels, [catId]: rank + 1 }
      : progress.catLevels,
  };
}

export function equip(
  progress: Progress,
  catId: string,
  itemId: string,
): Progress {
  if (!CATS.some((c) => c.id === catId)) return progress;
  const equipment = { ...progress.equipment };
  if (itemId === "") {
    delete equipment[catId];
    return { ...progress, equipment };
  }
  if (!progress.inventory.includes(itemId)) return progress;
  for (const id of Object.keys(equipment))
    if (equipment[id] === itemId) delete equipment[id];
  equipment[catId] = itemId;
  return { ...progress, equipment };
}

/** Wears Skin 1 or 2, or the original with 0; an unknown Companion or Skin changes nothing. */
export function setSkin(
  progress: Progress,
  catId: string,
  skin: number,
): Progress {
  if (!(catId in SKINS) || ![0, 1, 2].includes(skin)) return progress;
  const skins = { ...progress.skins };
  if (skin === 0) delete skins[catId];
  else skins[catId] = skin;
  return { ...progress, skins };
}

export function parseProgress(raw: string | null): Progress {
  try {
    const parsed: unknown = JSON.parse(raw ?? "null");
    if (!parsed || typeof parsed !== "object") return initialProgress();
    // `wins` is the field older saves used before victories were counted per Expedition.
    const x = parsed as Progress & { wins?: number };
    const num = (n: unknown) =>
      typeof n === "number" &&
      Number.isSafeInteger(n) &&
      n >= 0 &&
      n <= 1000000;
    if (
      x.version !== 1 ||
      !Array.isArray(x.claimedRuns) ||
      x.claimedRuns.length > 100 ||
      x.claimedRuns.some((id) => typeof id !== "string" || id.length > 100) ||
      Array.isArray(x.catLevels) ||
      Array.isArray(x.equipment) ||
      !num(x.gold) ||
      !num(x.xp) ||
      !num(x.generalLevel) ||
      !x.catLevels ||
      typeof x.catLevels !== "object" ||
      !x.equipment ||
      typeof x.equipment !== "object" ||
      !Array.isArray(x.inventory) ||
      x.inventory.some((i) => !ITEMS.includes(i)) ||
      Object.keys(x.catLevels).some(
        (id) => !CATS.some((c) => c.id === id) || !num(x.catLevels[id]),
      ) ||
      Object.keys(x.equipment).some(
        (id) =>
          !CATS.some((c) => c.id === id) ||
          !x.inventory.includes(x.equipment[id]!),
      ) ||
      new Set(Object.values(x.equipment)).size !==
        Object.values(x.equipment).length ||
      (x.wins !== undefined && !num(x.wins)) ||
      (x.expeditionWins !== undefined &&
        (!x.expeditionWins ||
          typeof x.expeditionWins !== "object" ||
          Array.isArray(x.expeditionWins) ||
          // Ids from a newer build are ignored below, not a reason to reset the save.
          Object.entries(x.expeditionWins).some(
            ([id, n]) => EXPEDITIONS.some((e) => e.id === id) && !num(n),
          ))) ||
      (x.spentGold !== undefined && !num(x.spentGold))
    )
      return initialProgress();
    const legacySpend =
      Object.values(x.catLevels).reduce(
        (sum, rank) => sum + 20 * rank + 10 * rank * (rank - 1),
        0,
      ) +
      20 * x.generalLevel +
      10 * x.generalLevel * (x.generalLevel - 1);
    return {
      version: 1,
      gold: x.gold,
      xp: x.xp,
      generalLevel: x.generalLevel,
      catLevels: { ...x.catLevels },
      equipment: { ...x.equipment },
      inventory: [...new Set(x.inventory)],
      claimedRuns: [...x.claimedRuns],
      // Older saves had one route: their victories belong to the first Expedition.
      expeditionWins: Object.fromEntries(
        Object.entries(
          x.expeditionWins ?? {
            [EXPEDITIONS[0]!.id]: x.wins ?? x.claimedRuns.length,
          },
        ).filter(([id]) => EXPEDITIONS.some((e) => e.id === id)),
      ),
      spentGold: x.spentGold ?? Math.min(1000000, legacySpend),
      // Older saves have no Skins; bad entries are dropped instead of resetting the save.
      skins: Object.fromEntries(
        Object.entries(
          x.skins && typeof x.skins === "object" && !Array.isArray(x.skins)
            ? x.skins
            : {},
        ).filter(([id, n]) => id in SKINS && (n === 1 || n === 2)),
      ),
    };
  } catch {
    return initialProgress();
  }
}
