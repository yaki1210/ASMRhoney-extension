import * as esbuild from "esbuild";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const outdir = mkdtempSync(path.join(tmpdir(), "ahx-logic-"));
const outfile = path.join(outdir, "logic-check.mjs");
await esbuild.build({
  entryPoints: [path.resolve("scripts/logic-check.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
});

const child = spawn(process.execPath, [outfile], { stdio: "inherit" });
const code = await new Promise((resolve) => child.on("exit", resolve));
process.exit(code ?? 1);
