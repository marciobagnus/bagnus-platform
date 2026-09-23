import { config as loadDotenv } from "dotenv";
import { Pool } from "pg";
import { resolve } from "node:path";

const E2E_ENV_PATH = resolve(process.cwd(), ".env.e2e");
const EXPECTED_DATABASE = "bagnus_e2e";

function loadE2eEnvironment(): string {
  const result = loadDotenv({ path: E2E_ENV_PATH, override: true });

  if (result.error) {
    throw new Error("No se pudo cargar .env.e2e.");
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(".env.e2e no define DATABASE_URL.");
  }

  let databaseName: string;

  try {
    databaseName = decodeURIComponent(new URL(connectionString).pathname.slice(1));
  } catch {
    throw new Error("DATABASE_URL en .env.e2e no tiene un formato válido.");
  }

  if (databaseName !== EXPECTED_DATABASE) {
    throw new Error("La DATABASE_URL de E2E no apunta a la base permitida.");
  }

  return connectionString;
}

export async function loadAndVerifyE2eEnvironment(): Promise<void> {
  const connectionString = loadE2eEnvironment();
  const pool = new Pool({ connectionString, max: 1 });

  try {
    const result = await pool.query<{ database_name: string }>(
      "SELECT current_database() AS database_name",
    );

    if (result.rows[0]?.database_name !== EXPECTED_DATABASE) {
      throw new Error("La conexión PostgreSQL no apunta a la base E2E esperada.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("base E2E")) {
      throw error;
    }

    throw new Error("No se pudo verificar la conexión PostgreSQL E2E.");
  } finally {
    await pool.end();
  }
}

export function e2ePort(): string {
  loadE2eEnvironment();
  return process.env.PORT ?? "3100";
}

if (process.argv.includes("--check-only")) {
  loadAndVerifyE2eEnvironment()
    .then(() => {
      process.stdout.write("E2E database verification passed.\n");
    })
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : "E2E database verification failed."}\n`,
      );
      process.exitCode = 1;
    });
}