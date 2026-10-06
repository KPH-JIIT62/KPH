// Firebase Admin is used for ONE thing here: checking that an ID token is genuine.
// Verification only needs the project ID, because the token's signature is checked against
// Google's public certificates. No service-account secret key is required for this.
const { initializeApp, getApps, getApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

function createFirebaseVerifier(projectId) {
  const app = getApps().length ? getApp() : initializeApp({ projectId });
  const auth = getAuth(app);
  // Resolves to the decoded token ({ uid, email, ... }) or rejects if forged, expired or for another project.
  return (idToken) => auth.verifyIdToken(idToken);
}

module.exports = { createFirebaseVerifier };
