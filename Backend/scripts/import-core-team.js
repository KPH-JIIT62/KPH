// Loads the core team roster from a CSV into the database. The CSV is the FULL list: after the import the database
// matches the file exactly (new lines are added, changed roles are updated, lines you deleted are removed).
//
//   npm run roles:import -- private/core-team.csv              apply it
//   npm run roles:import -- private/core-team.csv --dry-run    only show what WOULD change, write nothing
//
// The CSV holds personal data: keep it in Backend/private/ (git-ignored) and never commit it.
const fs = require("node:fs");
const path = require("node:path");
const { parseCoreTeamCsv } = require("../src/utils/coreTeamCsv");
const { createCoreTeamService } = require("../src/services/coreTeamService");

const DEFAULT_FILE = "private/core-team.csv";

async function run(pool, args, log = console.log) {
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const unknown = [...flags].filter((f) => !["--dry-run", "--allow-empty"].includes(f));
  if (unknown.length) throw new Error(`Unknown option ${unknown.join(", ")}. Options: --dry-run, --allow-empty.`);
  const dryRun = flags.has("--dry-run");
  const file = path.resolve(args.find((a) => !a.startsWith("--")) ?? DEFAULT_FILE);
  if (!fs.existsSync(file)) throw new Error(`File not found: ${file}\nPut your list at Backend/${DEFAULT_FILE} or pass its path.`);

  const { entries, errors } = parseCoreTeamCsv(fs.readFileSync(file, "utf8"));
  if (errors.length) {
    const lines = errors.map((e) => `  line ${e.line}: ${e.message}`).join("\n");
    throw new Error(`${path.basename(file)} has ${errors.length} problem(s). Nothing was imported:\n${lines}`);
  }

  const service = createCoreTeamService(pool);
  const result = await service.sync(entries, { dryRun: true }); // always look first
  if (entries.length === 0 && result.removed.length > 0 && !flags.has("--allow-empty")) {
    throw new Error(`The file lists nobody, which would REMOVE all ${result.removed.length} current core team members. Nothing was imported. If that is what you want, add --allow-empty.`);
  }
  const applied = dryRun ? result : await service.sync(entries);

  log(dryRun ? "DRY RUN: nothing was written.\n" : "Core team updated.\n");
  log(`  in the file : ${applied.total}`);
  log(`  added       : ${applied.added.length}${applied.added.map((a) => `\n      + ${a.enrollmentNo}  ${a.role}`).join("")}`);
  log(`  changed     : ${applied.changed.length}${applied.changed.map((c) => `\n      ~ ${c.enrollmentNo}  ${c.from} -> ${c.to}`).join("")}`);
  log(`  removed     : ${applied.removed.length}${applied.removed.map((r) => `\n      - ${r.enrollmentNo}  ${r.role}`).join("")}`);
  log(`  unchanged   : ${applied.unchanged}`);
  return applied;
}

module.exports = { run };

if (require.main === module) {
  const { loadEnv } = require("../src/config/env");
  const { createPool } = require("../src/db/pool");
  const env = loadEnv();
  const pool = createPool(env.databaseUrl, { ssl: env.databaseSsl, sslCaFile: env.databaseSslCaFile });
  run(pool, process.argv.slice(2))
    .catch((error) => { console.error(error.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
