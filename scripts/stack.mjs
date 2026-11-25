// One branch + worktree per chat, stacked PRs, landed bottom-up. See "Parallel chats" in CLAUDE.md.
//   node scripts/stack.mjs status | new <branch> [--on parent] [--files a,b] | adopt <branch> [--on parent]
//                          | submit [tip] [--yes] | land [tip] [--yes]
// Pushing and merging need the user's OK in chat; --yes only records that they gave it.
import process from "node:process";
import { execFileSync, execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  ROOT,
  chain,
  children,
  order,
  overlaps,
  validate,
} from "./stack-lib.mjs";

const out = (s = "") => process.stdout.write(`${s}\n`);
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
const common = execFileSync(
  "git",
  ["rev-parse", "--path-format=absolute", "--git-common-dir"],
  {
    encoding: "utf8",
  },
).trim();
const main = dirname(common); // the primary checkout: lanes, worktrees and gh calls all anchor here
const git = (...args) => run("git", args, main);
const gh = (...args) => run("gh", args, main);
const ref = (b) => (b === ROOT ? "origin/main" : b);
const sha = (b) => git("rev-parse", ref(b));
const file = join(main, ".scratch", "lanes.json");
const load = () =>
  existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
const save = (lanes) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(lanes, null, 2)}\n`);
};

function worktrees() {
  const map = {};
  let dir = "";
  for (const line of git("worktree", "list", "--porcelain").split("\n")) {
    if (line.startsWith("worktree ")) dir = line.slice(9);
    if (line.startsWith("branch refs/heads/")) map[line.slice(18)] = dir;
  }
  return map;
}
const needWorktree = (b) =>
  worktrees()[b] ?? fail(`${b} has no worktree; adopt it from one`);
const fail = (msg) => {
  throw new Error(msg);
};

async function confirm(question, yes) {
  if (yes) return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  if (answer.trim().toLowerCase() !== "y") fail("Cancelled");
}

function fetchOrigin() {
  try {
    git("fetch", "origin");
  } catch {
    out("warning: could not fetch origin, using what is local");
  }
}

function flags(args) {
  const f = { rest: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--yes") f.yes = true;
    else if (args[i] === "--on") f.on = args[++i];
    else if (args[i] === "--files")
      f.files = (args[++i] ?? "").split(",").filter(Boolean);
    else f.rest.push(args[i]);
  }
  return f;
}

const tipOf = (f) => f.rest[0] ?? git("rev-parse", "--abbrev-ref", "HEAD");

function register(lanes, branch, f, base) {
  const next = {
    ...lanes,
    [branch]: { parent: f.on ?? ROOT, base, files: f.files ?? [] },
  };
  const errors = validate(next);
  if (errors.length) fail(errors.join("\n"));
  save(next);
}

// A lane whose local branch was deleted (landed, cleaned up) must not break status or the overlap check.
function exists(b) {
  try {
    git("rev-parse", "--verify", "--quiet", `refs/heads/${b}`);
    return true;
  } catch {
    return false;
  }
}

function touched(lanes) {
  return Object.fromEntries(
    Object.entries(lanes)
      .filter(([b]) => exists(b))
      .map(([b, lane]) => {
        const diff = git("diff", "--name-only", `${ref(lane.parent)}...${b}`)
          .split("\n")
          .filter(Boolean);
        return [b, [...new Set([...lane.files, ...diff])]];
      }),
  );
}

function status() {
  fetchOrigin();
  const lanes = load();
  for (const e of validate(lanes)) out(`ERROR ${e}`);
  for (const b of order(lanes)) {
    const { parent, base } = lanes[b];
    if (!exists(b)) {
      out(`${b}: branch missing locally (remove it from .scratch/lanes.json)`);
      continue;
    }
    const [behind, ahead] = git(
      "rev-list",
      "--left-right",
      "--count",
      `${ref(parent)}...${b}`,
    ).split(/\s+/);
    let pr = "no PR";
    try {
      const [p] = JSON.parse(
        gh(
          "pr",
          "list",
          "--head",
          b,
          "--state",
          "all",
          "--json",
          "number,state,baseRefName",
        ),
      );
      if (p)
        pr = `#${p.number} ${p.state}${p.baseRefName === parent ? "" : ` (base ${p.baseRefName}, expected ${parent})`}`;
    } catch {
      pr = "PR unknown (gh failed)";
    }
    const stale = base === sha(parent) ? "" : "  needs restack";
    out(
      `${"  ".repeat(chain(lanes, b).length - 1)}${b} <- ${parent}  +${ahead} -${behind}  ${pr}${stale}`,
    );
  }
  for (const { a, b, files } of overlaps(lanes, touched(lanes)))
    out(`OVERLAP ${a} & ${b}: ${files.join(", ")}`);
  const loose = Object.keys(worktrees()).filter((b) => b !== ROOT && !lanes[b]);
  if (loose.length) out(`not registered (use adopt): ${loose.join(", ")}`);
}

// Tell the user, right after registering, which other lanes touch the same files.
function reportOverlaps(branch) {
  const lanes = load();
  const all = touched(lanes);
  for (const { a, b, files } of overlaps(lanes, all))
    if (a === branch || b === branch)
      out(
        `OVERLAP ${a} & ${b}: ${files.join(", ")} - tell the user before editing`,
      );
  // Chats that never registered a lane still show up as open PRs.
  try {
    const mine = new Set(all[branch] ?? []);
    for (const p of JSON.parse(
      gh("pr", "list", "--state", "open", "--json", "headRefName,number,files"),
    )) {
      if (p.headRefName === branch || lanes[p.headRefName]) continue;
      const files = p.files.map((x) => x.path).filter((x) => mine.has(x));
      if (files.length)
        out(
          `OVERLAP ${branch} & PR #${p.number} (${p.headRefName}): ${files.join(", ")} - tell the user before editing`,
        );
    }
  } catch {
    out("PR overlap check skipped (gh failed)");
  }
}

function newLane(f) {
  const [branch] = f.rest;
  if (!branch) fail("usage: new <branch> [--on parent] [--files a,b]");
  fetchOrigin();
  const lanes = load();
  const parent = f.on ?? ROOT;
  register(lanes, branch, f, sha(parent)); // validates before any git change
  const dir = join(main, ".claude", "worktrees", branch.replaceAll("/", "-"));
  git("worktree", "add", "-b", branch, dir, ref(parent));
  out(`${branch} <- ${parent} at ${dir}`);
  reportOverlaps(branch);
}

function adopt(f) {
  const [branch] = f.rest;
  if (!branch) fail("usage: adopt <branch> [--on parent]");
  register(load(), branch, f, git("merge-base", ref(f.on ?? ROOT), branch));
  out(`adopted ${branch} (nothing rebased)`);
  reportOverlaps(branch);
}

async function submit(f) {
  const lanes = load();
  const tip = tipOf(f);
  const stack = chain(lanes, tip);
  if (!stack.length) fail(`${tip} is not a registered lane`);
  out(
    `Will push with --force-with-lease and open or retarget PRs for: ${stack.join(" -> ")}`,
  );
  await confirm("Push approved in chat?", f.yes);
  fetchOrigin();
  for (const b of stack) {
    const { parent, base } = lanes[b];
    if (base !== sha(parent)) {
      try {
        run("git", ["rebase", "--onto", ref(parent), base, b], needWorktree(b));
      } catch {
        fail(
          `Rebase of ${b} hit conflicts. Resolve them in ${needWorktree(b)}, then rerun submit.`,
        );
      }
      lanes[b].base = sha(parent);
      save(lanes);
    }
    git("push", "--force-with-lease", "-u", "origin", b);
    const number = gh(
      "pr",
      "list",
      "--head",
      b,
      "--json",
      "number",
      "--jq",
      ".[0].number",
    );
    if (number) gh("pr", "edit", number, "--base", parent);
    else gh("pr", "create", "--base", parent, "--head", b, "--fill");
    out(`${b}: pushed, PR based on ${parent}`);
  }
}

async function land(f) {
  const lanes = load();
  const stack = chain(lanes, tipOf(f));
  if (!stack.length || lanes[stack[0]].parent !== ROOT)
    fail("Nothing to land from main upwards");
  out(
    `Will squash-merge into main, bottom first (each merge deploys to Pages): ${stack.join(" -> ")}`,
  );
  await confirm("Merge approved in chat?", f.yes);
  for (const b of stack) {
    fetchOrigin();
    const wt = needWorktree(b);
    git("push", "--force-with-lease", "-u", "origin", b);
    execSync("npm exec --yes --package=pnpm@11.25.0 -- pnpm check", {
      cwd: wt,
      stdio: "inherit",
    });
    gh("pr", "checks", b, "--watch", "--fail-fast");
    const landedTip = sha(b);
    gh("pr", "merge", b, "--squash");
    git("fetch", "origin");
    for (const c of children(lanes, b)) {
      gh(
        "pr",
        "edit",
        gh(
          "pr",
          "list",
          "--head",
          c,
          "--json",
          "number",
          "--jq",
          ".[0].number",
        ),
        "--base",
        ROOT,
      );
      Object.assign(lanes[c], { parent: ROOT, base: landedTip }); // resumable if the rebase below stops
      save(lanes);
      try {
        run(
          "git",
          ["rebase", "--onto", "origin/main", landedTip, c],
          needWorktree(c),
        );
      } catch {
        fail(
          `Rebase of ${c} hit conflicts. Resolve them in ${needWorktree(c)}, then run land again.`,
        );
      }
      lanes[c].base = sha(ROOT);
      save(lanes);
    }
    git("push", "origin", "--delete", b);
    try {
      git("worktree", "remove", wt); // refuses a dirty worktree: that is the safeguard
    } catch {
      out(
        `could not remove ${wt} (uncommitted changes, or Windows kept a file locked; see git above).`,
      );
    }
    // On Windows git can drop the worktree and still fail deleting its folder: the branch is free then.
    if (!Object.values(worktrees()).includes(wt)) git("branch", "-D", b);
    delete lanes[b];
    save(lanes);
    out(`${b}: landed`);
  }
  const notes = existsSync(join(main, ".scratch"))
    ? readdirSync(join(main, ".scratch")).filter((n) =>
        n.startsWith("handoff-"),
      )
    : [];
  if (notes.length)
    out(`Fold these into docs/HANDOFF.md in one pass: ${notes.join(", ")}`);
}

const [cmd, ...args] = process.argv.slice(2);
const commands = { status, new: newLane, adopt, submit, land };
try {
  if (!commands[cmd])
    fail("usage: node scripts/stack.mjs status | new | adopt | submit | land");
  await commands[cmd](flags(args));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
