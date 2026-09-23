import { spawn } from "node:child_process";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { loadAndVerifyE2eEnvironment } from "./e2e-env";

loadDotenv({ path: resolve(process.cwd(), ".env.e2e"), override: true });
await loadAndVerifyE2eEnvironment();

const prismaCliPath = resolve(process.cwd(), "node_modules/prisma/build/index.js");
const prismaProcess = spawn(process.execPath, [prismaCliPath, "migrate", "deploy"], {
  env: process.env,
  stdio: "inherit",
});

const exitCode = await new Promise<number>((resolveExit) => {
  prismaProcess.on("exit", (code) => resolveExit(code ?? 1));
  prismaProcess.on("error", () => resolveExit(1));
});

process.exitCode = exitCode;