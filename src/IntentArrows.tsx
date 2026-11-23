import { useEffect, useState, type RefObject } from "react";
import type { EnemyIntent } from "./game";

export interface IntentEntry {
  enemyId: string;
  intent: EnemyIntent;
}
interface Line {
  key: string;
  kind: "hostile" | "friendly";
  d: string;
}
/** How far above a unit card the arrows start and end, clearing its status icons. */
const CLEARANCE = 38;
/**
 * Draws enemy intents over the battlefield as high arcs above the characters:
 * a red arrow to the cat an enemy has marked, a green one to the enemy it will help.
 */
export function IntentArrows({
  containerRef,
  entries,
  version,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  entries: IntentEntry[];
  /** Changes whenever the battle state changes so arrows are measured again. */
  version: number;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const signature = entries
    .map(
      (e) => `${e.enemyId}>${e.intent.targetId ?? ""}|${e.intent.allyId ?? ""}`,
    )
    .join(",");
  // A passive effect runs after the parent's ref is attached, even on first mount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !signature) {
      setLines([]);
      return;
    }
    const measure = () => {
      const box = container.getBoundingClientRect();
      const anchor = (id: string) => {
        const card = container
          .querySelector(`[data-unit="${id}"]`)
          ?.getBoundingClientRect();
        return card
          ? ([
              card.left + card.width / 2 - box.left,
              card.top - box.top - CLEARANCE,
            ] as const)
          : undefined;
      };
      const next: Line[] = [];
      entries.forEach(({ enemyId, intent }, index) => {
        const from = anchor(enemyId);
        for (const [id, kind] of [
          [intent.targetId, "hostile"],
          [intent.allyId, "friendly"],
        ] as const) {
          const to = id ? anchor(id) : undefined;
          if (!from || !to) continue;
          // Higher arcs for farther targets; each enemy gets its own height.
          const top = Math.min(from[1], to[1]);
          const rise = 26 + Math.min(40, Math.abs(to[0] - from[0]) / 6);
          const arc = Math.max(6, top - rise - index * 10);
          next.push({
            key: `${enemyId}-${kind}-${id}`,
            kind,
            d: `M${from[0]} ${from[1]} C${from[0]} ${arc} ${to[0]} ${arc} ${to[0]} ${to[1]}`,
          });
        }
      });
      setSize({ width: box.width, height: box.height });
      setLines(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // `entries` is summarised by `signature`; `version` re-measures after each action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, signature, version]);
  if (!lines.length) return null;
  return (
    <svg
      className="intent-layer"
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      aria-hidden="true"
      data-testid="intent-arrows"
    >
      <defs>
        {(["hostile", "friendly"] as const).map((kind) => (
          <marker
            key={kind}
            id={`intent-head-${kind}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0L10 5L0 10Z" className={`intent-head ${kind}`} />
          </marker>
        ))}
      </defs>
      {lines.map((line) => (
        <path
          key={line.key}
          d={line.d}
          className={`intent-line ${line.kind}`}
          data-kind={line.kind}
          markerEnd={`url(#intent-head-${line.kind})`}
        />
      ))}
    </svg>
  );
}
