import type { CSSProperties } from "react";
const indices: Record<string, number> = {
  miso: 0,
  luna: 1,
  pip: 2,
  clover: 3,
  ember: 4,
  "Crypt rat": 5,
  "Moss slime": 6,
  "Bone sentry": 7,
  "Cave bat": 8,
  "Spore imp": 6,
  "The Hollow King": 9,
  "Royal wisp": 8,
  "Bone squire": 7,
};
export function Sprite({
  id,
  name,
  className = "",
}: {
  id: string;
  name?: string;
  className?: string;
}) {
  const i = indices[id] ?? 0;
  return (
    <span
      role={name ? "img" : undefined}
      aria-label={name}
      aria-hidden={name ? undefined : true}
      className={`sprite ${className}`}
      style={
        {
          "--sprite-x": `${(i % 5) * 25}%`,
          "--sprite-y": `${Math.floor(i / 5) * 100}%`,
        } as CSSProperties
      }
    />
  );
}
export default Sprite;
