// Guard: this project is JavaScript-only (CONVENTIONS.md §3).
// Fails if any TypeScript artifact sneaks into source dirs.
const { execSync } = require("node:child_process");

const cmd =
  process.platform === "win32"
    ? 'Get-ChildItem -Path app,components,lib,hooks,public -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match "^\\\\.tsx?$" -or $_.Name -eq "tsconfig.json" -or $_.Name -eq "next-env.d.ts" } | Select-Object -ExpandProperty FullName'
    : "find app components lib hooks public -type f \\( -name '*.ts' -o -name '*.tsx' -o -name 'tsconfig.json' -o -name 'next-env.d.ts' \\) 2>/dev/null";

let hits = "";
try {
  hits = execSync(cmd, { encoding: "utf8", shell: process.platform === "win32" ? "powershell.exe" : "/bin/sh" }).trim();
} catch {
  hits = "";
}

if (hits) {
  console.error("check:no-ts FAILED — TypeScript artifacts found:\n" + hits);
  process.exit(1);
}
console.log("check:no-ts OK — no .ts/.tsx/tsconfig.json/next-env.d.ts in source dirs.");
