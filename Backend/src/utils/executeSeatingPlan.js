const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_PATH = path.resolve(__dirname, "../../data/execute-seating-plan.csv");
const PLACEHOLDER = "Seating plan will be updated at 1200 hours on 31st October 2026";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"' && value === "") quoted = true;
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(value); value = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else value += char;
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

const normalizeHeader = (value) => String(value || "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function getSeatingPlan(leaderEnrollmentNo, teamName, csvPath = DEFAULT_PATH) {
  const fallback = { teamName, hallName: null, labNumber: null, systemNumber: null, message: PLACEHOLDER };
  try {
    const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
    if (rows.length < 2) return fallback;
    const headers = rows[0].map(normalizeHeader);
    const column = (...names) => headers.findIndex((header) => names.includes(header));
    const leaderIndex = column("team_leader_enrollment_number", "team_leader_enrollment_no", "leader_enrollment_number", "leader_enrollment_no");
    const teamIndex = column("team_name");
    const hallIndex = column("hall_name", "hall");
    const labIndex = column("lab_number", "lab_no", "lab");
    const systemIndex = column("system_number", "system_no", "system");
    if ([leaderIndex, teamIndex, hallIndex, labIndex, systemIndex].some((index) => index < 0)) return fallback;
    const matchingRow = rows.slice(1).find((cells) => String(cells[leaderIndex] || "").trim() === String(leaderEnrollmentNo || "").trim());
    if (!matchingRow) return fallback;
    const field = (index) => String(matchingRow[index] || "").trim() || null;
    const hallName = field(hallIndex);
    const labNumber = field(labIndex);
    const systemNumber = field(systemIndex);
    if (!hallName || !labNumber || !systemNumber) return fallback;
    return { teamName: field(teamIndex) || teamName, hallName, labNumber, systemNumber, message: null };
  } catch {
    return fallback;
  }
}

module.exports = { DEFAULT_PATH, PLACEHOLDER, parseCsv, getSeatingPlan };
