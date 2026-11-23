import { useLayoutEffect, useState, type RefObject } from "react";
import type { EnemyIntent } from "./game";

interface Line {
  key: string;
  kind: "hostile" | "friendly";
  d: string;
}
/** Shorten a segment at both ends so arrows start and stop at the sprites' edges. */
function trim(x1: number, y1: number, x2: number, y2: number, by: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const k = Math.min(by, length / 3) / length;
  return [x1 + dx * k, y1 + dy * k, x2 - dx * k, y2 - dy * k] as const;
}
/**
 * Draws the selected enemy's next action over the battlefield: a red arrow to
 * the cat it has marked, or a green arrow to the enemy it will help.
 */
export function IntentArrows({
  containerRef,
  enemyId,
  intent,
  version,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  enemyId?: string;
  intent?: EnemyIntent;
  /** Changes whenever the battle state changes so arrows are measured again. */
  version: number;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const targetId = intent?.targetId;
  const allyId = intent?.allyId;
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !enemyId || (!targetId && !allyId)) {
      setLines([]);
      return;
    }
    const measure = () => {
      const box = container.getBoundingClientRect();
      const center = (id: string) => {
        const el = container
          .querySelector(`[data-unit="${id}"] .unit-target`)
          ?.getBoundingClientRect();
        return el
          ? ([
              el.left + el.width / 2 - box.left,
              el.top + el.height / 2 - box.top,
            ] as const)
          : undefined;
      };
      const from = center(enemyId);
      const next: Line[] = [];
      for (const [id, kind] of [
        [targetId, "hostile"],
        [allyId, "friendly"],
      ] as const) {
        const to = id ? center(id) : undefined;
        if (!from || !to) continue;
        const [x1, y1, x2, y2] = trim(from[0], from[1], to[0], to[1], 52);
        const lift = Math.min(70, Math.hypot(x2 - x1, y2 - y1) / 3);
        next.push({
          key: `${kind}-${id}`,
          kind,
          d: `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 - lift} ${x2} ${y2}`,
        });
      }
      setSize({ width: box.width, height: box.height });
      setLines(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [containerRef, enemyId, targetId, allyId, version]);
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
            orient="auto-start-reverse"
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
