// Entry point: load config, connect to the database, start listening.
const { loadEnv } = require("./src/config/env");
const { createPool } = require("./src/db/pool");
const { createFirebaseVerifier } = require("./src/config/firebase");
const { createApp } = require("./src/app");

const env = loadEnv();
const pool = createPool(env.databaseUrl, { ssl: env.databaseSsl, sslCaFile: env.databaseSslCaFile });
const app = createApp({ env, pool, verifyToken: createFirebaseVerifier(env.firebaseProjectId) });

const server = app.listen(env.port, () => console.log(`KPH API listening on http://localhost:${env.port}`));

function shutdown() {
  server.close(() => pool.end().finally(() => process.exit(0)));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
