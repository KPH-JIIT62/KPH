// Google shows JIIT accounts as "SHREYANSH SRIVASTAVA 2501030069": ALL CAPS with the enrollment number
// glued on. We store the clean version ("Shreyansh Srivastava") because it is what certificates,
// team lists and leaderboards will print.
const titleCase = (text) => text.toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (match, before, letter) => before + letter.toUpperCase());

function cleanDisplayName(rawName, email = "") {
  const original = String(rawName || "").trim();
  // Drop any word made only of 5+ digits (an enrollment number). Short numbers ("Agent 007") stay.
  let name = original.split(/\s+/).filter((word) => !/^\d{5,}$/.test(word)).join(" ").trim();
  if (!name) {
    // Nothing usable left: build a name from the email, "prof.sharma@..." -> "Prof Sharma".
    name = String(email).split("@")[0].split(/[._-]+/).filter(Boolean).join(" ") || "Member";
  }
  // Fix the capitals only when the name is ALL CAPS or all lower case, so "McDonald" is left alone.
  if (name === name.toUpperCase() || name === name.toLowerCase()) name = titleCase(name);
  return name.slice(0, 80);
}

module.exports = { cleanDisplayName };
