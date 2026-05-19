#!/usr/bin/env node
// Wraps `netlify dev` so we can intercept the known neon-buildhooks 401
// failure (Netlify CLI auth missing team-level perms for the Neon
// integration). Without this wrapper, the plugin crashes mid-boot with a
// wall of stack trace and `netlify dev` exits without ever starting Vite.

import { spawn } from "node:child_process";

const child = spawn("npx", ["--no-install", "netlify", "dev"], {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
});

let intercepted = false;

const PLUGIN_FAILURE =
  /neon-buildhooks.*(internal error|Could not start)|Could not start local development server/i;

function watch(stream, pipeTo) {
  let buffer = "";
  stream.on("data", (chunk) => {
    const text = chunk.toString();
    pipeTo.write(text);

    if (intercepted) return;
    buffer = (buffer + text).slice(-4000);

    if (/neon-buildhooks/.test(buffer) && /Could not start|internal error/i.test(buffer)) {
      intercepted = true;
      printRemediation();
      child.kill("SIGTERM");
    }
  });
}

watch(child.stdout, process.stdout);
watch(child.stderr, process.stderr);

function printRemediation() {
  const msg = [
    "",
    "\x1b[31m✗ netlify dev failed: Neon integration plugin got a 401.\x1b[0m",
    "",
    "  Your Netlify CLI session is valid for the account, but is missing",
    "  the team-level scope the Neon plugin needs to read site config.",
    "",
    "  Fix one of two ways:",
    "",
    "    1. Re-auth and try again (Functions + DB will work):",
    "         netlify logout && netlify login",
    "         npm run dev",
    "",
    "    2. Skip Functions, run the Vite frontend only:",
    "         npm run dev:vite",
    "",
  ].join("\n");
  process.stderr.write(msg + "\n");
}

child.on("exit", (code, signal) => {
  if (intercepted) process.exit(1);
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
