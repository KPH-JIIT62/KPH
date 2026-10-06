// Reads configuration from environment variables (and Backend/.env if it exists).
// Secrets and per-machine settings live here, never in code.
const fs = require("node:fs");
const path = require("node:path");

function loadEnv() {
  const envFile = path.join(__dirname, "..", "..", ".env");
  // loadEnvFile never overrides variables that are already set, so real server settings win.
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

  const missing = ["DATABASE_URL", "FIREBASE_PROJECT_ID"].filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. Copy Backend/.env.example to Backend/.env and fill them in.`);
  }
  const databaseSsl = (process.env.DATABASE_SSL || "off").toLowerCase();
  if (!["off", "verify", "no-verify"].includes(databaseSsl)) {
    throw new Error('DATABASE_SSL must be "off", "verify" or "no-verify".');
  }
  if (databaseSsl === "no-verify") {
    console.warn("WARNING: DATABASE_SSL=no-verify does not check the database certificate. Use it for local development only.");
  }
  return {
    databaseSsl,
    databaseSslCaFile: process.env.DATABASE_SSL_CA_FILE || undefined,
    port: Number(process.env.PORT) || 5000,
    databaseUrl: process.env.DATABASE_URL,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    allowedEmailDomain: (process.env.ALLOWED_EMAIL_DOMAIN || "mail.jiit.ac.in").toLowerCase(),
    corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map((o) => o.trim()).filter(Boolean),
  };
}

module.exports = { loadEnv };
