// Entry point: load config, connect to the database, start listening.
const { loadEnv } = require("./src/config/env");
const { createPool } = require("./src/db/pool");
const { createFirebaseVerifier } = require("./src/config/firebase");
const { createApp } = require("./src/app");
const { migrate } = require("./scripts/migrate");
const { refreshStoredYearOfStudy } = require("./src/services/userService");

const env = loadEnv();
const pool = createPool(env.databaseUrl, { ssl: env.databaseSsl, sslCaFile: env.databaseSslCaFile });

async function start() {
  try {
    await migrate(pool, (msg) => console.log(`[db-migration] ${msg}`));
  } catch (err) {
    console.warn(`[db-migration] Migration notice: ${err.message}`);
  }

  await refreshStoredYearOfStudy(pool);
  const academicYearRefresh = setInterval(() => {
    refreshStoredYearOfStudy(pool).catch((err) => console.error(`[year-of-study] Refresh failed: ${err.message}`));
  }, 6 * 60 * 60 * 1000);

  const app = createApp({ env, pool, verifyToken: createFirebaseVerifier(env.firebaseProjectId) });
  const server = app.listen(env.port, () => console.log(`KPH API listening on http://localhost:${env.port}`));

  function shutdown() {
    clearInterval(academicYearRefresh);
    server.close(() => pool.end().finally(() => process.exit(0)));
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start();
