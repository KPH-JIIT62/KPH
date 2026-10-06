// A connection pool keeps a few database connections open and reuses them,
// because opening a new connection for every request is slow.
const fs = require("node:fs");
const { Pool } = require("pg");

// DATABASE_SSL controls encryption between this server and the database:
//   off        no encryption (fine for a database on your own computer)         <- default
//   verify     encrypted AND the database's certificate is checked (use in production;
//              for Supabase also set DATABASE_SSL_CA_FILE to the CA certificate file you download from them)
//   no-verify  encrypted, but the certificate is NOT checked. OK for local development only:
//              it stops eavesdropping but not someone impersonating the database.
function sslOptions(mode, caFile) {
  if (mode === "off") return false;
  if (mode === "no-verify") return { rejectUnauthorized: false };
  return { rejectUnauthorized: true, ...(caFile ? { ca: fs.readFileSync(caFile, "utf8") } : {}) };
}

function createPool(connectionString, { ssl = "off", sslCaFile } = {}) {
  // Remove "?sslmode=..." from the URL: it would silently override the setting above.
  const url = connectionString.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
  const pool = new Pool({ connectionString: url, ssl: sslOptions(ssl, sslCaFile), max: 10 });
  pool.on("error", (error) => console.error("Unexpected database error:", error.message));
  return pool;
}

module.exports = { createPool };
