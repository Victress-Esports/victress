// Loads lib/riot/core.ts for scripts by transpiling it (no network, no key). Test tooling only.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const ts = createRequire(import.meta.url)("typescript");
export async function loadRiot() {
  return loadFiles(["core", "queues", "normalize"]);
}
async function loadFiles(names) {
  const dir = mkdtempSync(join(tmpdir(), "riot-core-"));
  for (const n of names) {
    const out = ts.transpileModule(readFileSync(`lib/riot/${n}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    writeFileSync(join(dir, `${n}.mjs`), out.replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"'));
  }
  const [core, queues, normalize] = await Promise.all(names.map((n) => import(pathToFileURL(join(dir, `${n}.mjs`)).href)));
  return { ...core, ...queues, ...normalize };
}
