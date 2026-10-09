// The core-team roles, in one place. (The database has a matching CHECK in migration 008.)
// To add a role: add its name here, then add it to the CHECK in a new migration.
const CORE_TEAM_ROLES = ["COORDINATOR", "VOLUNTEER"];

module.exports = { CORE_TEAM_ROLES };
