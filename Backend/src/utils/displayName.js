// Google shows college accounts as "SHREYANSH SRIVASTAVA 2501030069": ALL CAPS with the enrollment number
// attached. We store the clean version ("Shreyansh Srivastava") because it is what certificates,
// team lists and leaderboards will print.
//
// The number is not always attached the same way (campus 62 and campus 128 accounts differ), so instead of
// expecting one format we remove an enrollment number (5+ digits) wherever it is and whatever is around it:
//   "NAME 992501030399"   "NAME (992501030399)"   "NAME [992501030399]"   "NAME <992501030399>"
//   "NAME - 992501030399" "NAME_992501030399"     "NAME992501030399"      "992501030399 NAME"
//   "Name <992501030399@mail.jiit.ac.in>"
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF]/g; // zero-width characters that can hide inside a name
const EMAIL = /[<(\[{]?[^\s<>()\[\]{}]*@[^\s<>()\[\]{}]*[>)\]}]?/g; // an email address, with any brackets around it
const NUMBER = /[<(\[{]?\s*\d{5,}\s*[>)\]}]?/g; // an enrollment number, with any brackets around it
const EDGE_JUNK = /^[\s\-–—_|,:;/\\.]+|[\s\-–—_|,:;/\\]+$/g; // separators left dangling at either end ("NAME -")

const titleCase = (text) => text.toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (match, before, letter) => before + letter.toUpperCase());

function cleanDisplayName(rawName, email = "") {
  const original = String(rawName || "").trim();
  // Short numbers ("Agent 007") are part of a name and stay; only 5+ digits count as an enrollment number.
  let name = original
    .replace(INVISIBLE, "")
    .replace(EMAIL, " ")
    .replace(NUMBER, " ")
    .replace(/\s+/g, " ")
    .replace(EDGE_JUNK, "")
    .trim();
  if (!name) {
    // Nothing usable left: build a name from the email, "prof.sharma@..." -> "Prof Sharma".
    name = String(email).split("@")[0].split(/[._-]+/).filter(Boolean).join(" ") || "Member";
  }
  // Fix the capitals only when the name is ALL CAPS or all lower case, so "McDonald" is left alone.
  if (name === name.toUpperCase() || name === name.toLowerCase()) name = titleCase(name);
  return name.slice(0, 80);
}

module.exports = { cleanDisplayName };
