import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { loadAndVerifyE2eEnvironment } from "./e2e-env";

loadDotenv({ path: resolve(process.cwd(), ".env.e2e"), override: true });

for (const variable of [
  "BAGNUS_USER_USERNAME",
  "BAGNUS_USER_DISPLAY_NAME",
  "BAGNUS_USER_PASSWORD",
  "BAGNUS_USER_ROLE",
]) {
  if (!process.env[variable]) {
    throw new Error(`${variable} no está configurada en el entorno local.`);
  }
}

await loadAndVerifyE2eEnvironment();
await import("./create-internal-user.ts");