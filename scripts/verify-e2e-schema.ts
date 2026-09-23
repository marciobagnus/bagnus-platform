import { config as loadDotenv } from "dotenv";
import { Pool } from "pg";
import { resolve } from "node:path";
import { loadAndVerifyE2eEnvironment } from "./e2e-env";

const requiredTables = [
  "customers",
  "machines",
  "repair_orders",
  "repair_quotes",
  "quote_decisions",
  "payments",
  "internal_users",
  "internal_sessions",
  "repair_status_history",
  "diagnosis_charges",
];

await loadAndVerifyE2eEnvironment();
loadDotenv({ path: resolve(process.cwd(), ".env.e2e"), override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  const result = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
     ORDER BY table_name`,
    [requiredTables],
  );
  const foundTables = result.rows.map((row) => row.table_name);
  const missingTables = requiredTables.filter(
    (tableName) => !foundTables.includes(tableName),
  );

  process.stdout.write(
    `${JSON.stringify({ foundTables, missingTables })}\n`,
  );

  if (missingTables.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}