// Client-side college-account check. This is only a convenience (it gives instant feedback);
// the REAL enforcement happens on the backend (Backend/src/middleware/authenticate.js).
export const allowedEmailDomain = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "mail.jiit.ac.in").toLowerCase();

export function isAllowedEmail(email: string | null | undefined) {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  return at > 0 && email.slice(at + 1).toLowerCase() === allowedEmailDomain;
}
