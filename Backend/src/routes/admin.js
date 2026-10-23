const { Router } = require("express");

function createAdminRouter(controller) {
  const router = Router();

  // Contests
  router.get("/contests", controller.listContests);
  router.post("/contests", controller.createContest);
  router.patch("/contests/:slug", controller.updateContest);
  router.delete("/contests/:slug", controller.deleteContest);

  // Certificates & Leaderboard
  router.post("/certificates/preview", controller.previewLeaderboard);
  router.post("/certificates/generate", controller.generateCertificates);
  router.post("/certificates/send-email", controller.sendCertificatesEmail);
  router.get("/certificates/pdf/:filename", controller.getCertificatePdf);

  // Admin Access Identifiers
  router.get("/access", controller.listAdminAccess);
  router.post("/access", controller.addAdminAccess);
  router.delete("/access/:id", controller.removeAdminAccess);

  return router;
}

module.exports = { createAdminRouter };

