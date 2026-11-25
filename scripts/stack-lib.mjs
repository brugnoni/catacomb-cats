// Pure rules for the lane registry (.scratch/lanes.json): { [branch]: { parent, base, files } }.
// `parent` is "main" or another lane; `base` is the parent tip this branch was last cut or rebased from.
export const ROOT = "main";
export const MAX_DEPTH = 3;

/** Lanes from the one cut from main down to `branch`; stops (without looping) on a cycle or unknown parent. */
export function chain(lanes, branch) {
  const path = [];
  for (
    let b = branch;
    b !== ROOT && lanes[b] && !path.includes(b);
    b = lanes[b].parent
  )
    path.unshift(b);
  return path;
}

export function validate(lanes) {
  const errors = [];
  for (const [branch, lane] of Object.entries(lanes)) {
    if (lane.parent !== ROOT && !lanes[lane.parent])
      errors.push(`${branch}: unknown parent ${lane.parent}`);
    const path = chain(lanes, branch);
    if (path.length && lanes[path[0]].parent !== ROOT)
      errors.push(`${branch}: parent chain never reaches ${ROOT}`);
    else if (path.length > MAX_DEPTH)
      errors.push(
        `${branch}: stack is ${path.length} deep, the limit is ${MAX_DEPTH}`,
      );
  }
  return errors;
}

/** Every lane, parents before children. Assumes validate() passed. */
export function order(lanes) {
  return Object.keys(lanes).sort(
    (a, b) => chain(lanes, a).length - chain(lanes, b).length,
  );
}

export const children = (lanes, branch) =>
  order(lanes).filter((b) => lanes[b].parent === branch);

/** Pairs of independent lanes (not parent/child of each other) that touch the same files. */
export function overlaps(lanes, touched) {
  const names = Object.keys(touched);
  const out = [];
  for (const [i, a] of names.entries())
    for (const b of names.slice(i + 1)) {
      if (chain(lanes, a).includes(b) || chain(lanes, b).includes(a)) continue;
      const shared = touched[a].filter((f) => touched[b].includes(f));
      if (shared.length) out.push({ a, b, files: shared });
    }
  return out;
}
