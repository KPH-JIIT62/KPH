function isExecuteMandatory(user) {
  if (!user) return false;
  const enrollmentNo = String(user.enrollment_no || "").trim();
  const branch = String(user.branch || "").trim().toUpperCase();
  return user.campus === "Campus 62" && enrollmentNo.startsWith("25") && branch === "CSE" && user.year_of_study === 2;
}

module.exports = { isExecuteMandatory };
