import process from "node:process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = realpathSync(
  resolve(dirname(fileURLToPath(import.meta.url)), ".."),
);
const manifest = JSON.parse(
  readFileSync(resolve(root, "outputs/transfer/manifest.json"), "utf8"),
);
if (
  manifest.format !== 1 ||
  manifest.project !== "catacomb-cats" ||
  !Array.isArray(manifest.files)
)
  throw new Error("Unsupported transfer manifest");
let failures = 0;
for (const entry of manifest.files) {
  try {
    if (typeof entry.path !== "string" || isAbsolute(entry.path))
      throw new Error("Invalid path");
    const path = realpathSync(resolve(root, entry.path));
    const within = relative(root, path);
    if (within === ".." || within.startsWith(`..${sep}`) || isAbsolute(within))
      throw new Error("Path escapes project");
    const actual = createHash("sha256")
      .update(readFileSync(path))
      .digest("hex");
    if (actual !== entry.sha256 || statSync(path).size !== entry.bytes)
      throw new Error("Content differs");
  } catch (error) {
    failures++;
    process.stderr.write(`${entry.path}: ${error.message}\n`);
  }
}
if (failures) {
  process.stderr.write(
    `${failures} file(s) missing or changed since packaging.\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Verified ${manifest.files.length} project files against the transfer manifest.\n`,
  );
}
