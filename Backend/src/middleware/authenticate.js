// AUTHENTICATION: "who is this?"  Runs before every protected route.
//
//   Authorization: Bearer <Firebase ID token>
//        |
//        v  1. is a token present?
//        v  2. is it genuine (signature, expiry, our project)?      -> 401 if not
//        v  3. is it a verified Google account from our college?    -> 403 if not
//        v  4. load (or create) OUR user row, with OUR role         -> req.user
//
// The user's identity is taken ONLY from the verified token. We never read a user id, email or role
// from the request body, query string or custom headers, because the client can write anything there.
const { HttpError } = require("../utils/HttpError");
const { cleanDisplayName } = require("../utils/displayName");

function isAllowedEmail(email, allowedDomain) {
  if (typeof email !== "string") return false;
  const at = email.lastIndexOf("@");
  // Compare the WHOLE domain. endsWith() alone would accept "me@mail.jiit.ac.in.evil.com".
  return at > 0 && email.slice(at + 1).toLowerCase() === allowedDomain;
}

function authenticate({ verifyToken, userService, allowedEmailDomain }) {
  // Express 5 forwards errors thrown from async functions to the error handler automatically.
  return async function authenticateRequest(req, res, next) {
    const [scheme, token] = (req.get("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "UNAUTHENTICATED", "Sign in required.");
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch {
      throw new HttpError(401, "INVALID_TOKEN", "Your session is invalid or has expired. Please sign in again.");
    }

    // The domain rule is enforced HERE, on the server. Anything the browser does is only a convenience.
    const email = (decoded.email || "").toLowerCase();
    const signedInWithGoogle = decoded.firebase?.sign_in_provider === "google.com";
    if (!decoded.email_verified || !signedInWithGoogle || !isAllowedEmail(email, allowedEmailDomain)) {
      throw new HttpError(403, "DOMAIN_NOT_ALLOWED", `Please sign in with your @${allowedEmailDomain} Google account.`);
    }

    req.user = await userService.findOrCreateFromFirebase({
      uid: decoded.uid,
      email,
      displayName: cleanDisplayName(decoded.name, email),
      photoUrl: decoded.picture || null,
    });
    next();
  };
}

module.exports = { authenticate, isAllowedEmail };
