/** Pictures the battle needs. Loading them first keeps combat from starting on empty scenery. */
const ART = ["art/crypt.png", "art/characters.png", "art/burrow.png"];

/**
 * Resolves when the battle art is loaded and at least `minMs` have passed, or
 * after `maxMs` at the latest so a slow connection never blocks the game.
 */
export function preloadArt(minMs = 900, maxMs = 5000): Promise<void> {
  const base = import.meta.env.BASE_URL;
  const loads = ART.map(
    (src) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = image.onerror = () => resolve();
        image.src = base + src;
      }),
  );
  const pause = new Promise<void>((resolve) => setTimeout(resolve, minMs));
  const cap = new Promise<void>((resolve) => setTimeout(resolve, maxMs));
  return Promise.race([Promise.all([...loads, pause]).then(() => {}), cap]);
}
