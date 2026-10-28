const { describeAcademic } = require("./academic");

function isExecuteMandatory(user, now = new Date()) {
  if (!user) return false;
  const enrollmentNo = String(user.enrollment_no || "").trim();
  const branch = String(user.branch || "").trim().toUpperCase();
  const academic = describeAcademic(enrollmentNo, now);
  return academic.campus === "62" && enrollmentNo.startsWith("25") && branch === "CSE" && academic.yearOfStudy === 2;
}

module.exports = { isExecuteMandatory };
