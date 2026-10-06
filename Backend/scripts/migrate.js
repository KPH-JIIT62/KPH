// Minimal migration runner: applies db/migrations/*.sql in filename order, once each.
// Applied files are recorded in the schema_migrations table, so running it twice is safe.
const fs = require("node:fs");
const path = require("node:path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

async function migrate(pool, log = console.log) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename   TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  const { rows } = await pool.query("SELECT filename FROM schema_migrations");
  const applied = new Set(rows.map((row) => row.filename));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN"); // all-or-nothing: a failing migration leaves no half-built tables
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      log(`applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${error.message}`);
    } finally {
      client.release();
    }
  }
  if (!files.some((f) => !applied.has(f))) log("database is up to date");
}

module.exports = { migrate };

if (require.main === module) {
  const { loadEnv } = require("../src/config/env");
  const { createPool } = require("../src/db/pool");
  const env = loadEnv();
  const pool = createPool(env.databaseUrl, { ssl: env.databaseSsl, sslCaFile: env.databaseSslCaFile });
  migrate(pool)
    .catch((error) => { console.error(error.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
