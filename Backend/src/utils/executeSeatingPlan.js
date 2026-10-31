const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_PATH = path.resolve(__dirname, "../../data/execute-seating-plan.csv");
const PLACEHOLDER = "All registrations till 12:00 pm today have been made live. Registrations made after 12:00 pm today will be made live at 2:00 pm today.";

function registeredAfterNoonIndia(createdAt) {
  if (!createdAt) return false;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return values.year === "2026" && values.month === "10" && values.day === "31"
    && (Number(values.hour) > 12 || (Number(values.hour) === 12 && Number(values.minute) >= 0));
}

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

function getSeatingPlan(leaderEnrollmentNo, teamName, csvPath = DEFAULT_PATH, createdAt = null) {
  const fallback = { teamName, hallName: null, labNumber: null, systemNumber: null, message: PLACEHOLDER };
  if (registeredAfterNoonIndia(createdAt)) return fallback;
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
    const matchingRow = rows.slice(1).find((cells) =>
      String(cells[leaderIndex] || "").trim() === String(leaderEnrollmentNo || "").trim()
      && String(cells[teamIndex] || "").trim().toLocaleLowerCase() === String(teamName || "").trim().toLocaleLowerCase());
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

module.exports = { DEFAULT_PATH, PLACEHOLDER, parseCsv, getSeatingPlan, registeredAfterNoonIndia };
