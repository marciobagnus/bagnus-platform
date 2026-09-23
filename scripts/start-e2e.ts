import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { loadAndVerifyE2eEnvironment, e2ePort } from "./e2e-env";

try {
  await loadAndVerifyE2eEnvironment();

  const nextCliPath = resolve(process.cwd(), "node_modules/next/dist/bin/next");
  const nextProcess = spawn(process.execPath, [nextCliPath, "dev", "-p", e2ePort()], {
    env: process.env,
    stdio: "inherit",
  });

  nextProcess.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
} catch (error: unknown) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "E2E server startup failed."}\n`,
  );
  process.exitCode = 1;
}