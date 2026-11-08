// Loads lib/riot/core.ts for scripts by transpiling it (no network, no key). Test tooling only.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const ts = createRequire(import.meta.url)("typescript");
export async function loadRiot() {
  const dir = mkdtempSync(join(tmpdir(), "riot-core-"));
  const out = ts.transpileModule(readFileSync("lib/riot/core.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  writeFileSync(join(dir, "core.mjs"), out);
  return import(pathToFileURL(join(dir, "core.mjs")).href);
}
