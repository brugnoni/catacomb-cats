import { useEffect, useState, type RefObject } from "react";
import type { EnemyIntent } from "./game";

export interface IntentEntry {
  enemyId: string;
  intent: EnemyIntent;
}
interface Line {
  key: string;
  kind: "hostile" | "friendly" | "curse";
  d: string;
}
/** Gap between the unit cards and the first thread, and between stacked threads. */
const BASE_GAP = 14;
const STACK_GAP = 7;
/**
 * Draws enemy intents as threads under the battlefield cards: down from the
 * enemy, along the floor, and up to the cat it marked (red) or the enemy it
 * will help (green).
 */
export function IntentArrows({
  containerRef,
  entries,
  version,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  entries: IntentEntry[];
  /** Changes whenever the battle state changes so threads are measured again. */
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
      // CSS zoom on an ancestor scales rects but not the svg's own units.
      const scale = box.width / container.offsetWidth || 1;
      // The absolutely positioned svg starts inside the container's border.
      const originX = box.left + container.clientLeft * scale;
      const originY = box.top + container.clientTop * scale;
      const card = (id: string) => {
        const rect = container
          .querySelector(`[data-unit="${id}"]`)
          ?.getBoundingClientRect();
        return rect
          ? {
              x: (rect.left + rect.width / 2 - originX) / scale,
              bottom: (rect.bottom - originY) / scale,
            }
          : undefined;
      };
      const floor = Math.max(
        0,
        ...[...container.querySelectorAll("[data-unit]")].map(
          (el) => (el.getBoundingClientRect().bottom - originY) / scale,
        ),
      );
      const next: Line[] = [];
      let stack = 0;
      for (const { enemyId, intent } of entries) {
        const from = card(enemyId);
        for (const [id, kind] of [
          [intent.targetId, intent.kind === "curse" ? "curse" : "hostile"],
          [intent.allyId, "friendly"],
        ] as const) {
          const to = id ? card(id) : undefined;
          if (!from || !to) continue;
          const y = floor + BASE_GAP + stack++ * STACK_GAP;
          next.push({
            key: `${enemyId}-${kind}-${id}`,
            kind,
            d: `M${from.x} ${from.bottom} V${y} H${to.x} V${to.bottom}`,
          });
        }
      }
      setSize({ width: box.width / scale, height: box.height / scale });
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
        {(["hostile", "friendly", "curse"] as const).map((kind) => (
          <marker
            key={kind}
            id={`intent-dot-${kind}`}
            viewBox="0 0 6 6"
            refX="3"
            refY="3"
            markerWidth="2.4"
            markerHeight="2.4"
          >
            <circle cx="3" cy="3" r="3" className={`intent-dot ${kind}`} />
          </marker>
        ))}
      </defs>
      {lines.map((line) => (
        <path
          key={line.key}
          d={line.d}
          pathLength={1}
          className={`intent-line ${line.kind}`}
          data-kind={line.kind}
          markerStart={`url(#intent-dot-${line.kind})`}
          markerEnd={`url(#intent-dot-${line.kind})`}
        />
      ))}
    </svg>
  );
}
