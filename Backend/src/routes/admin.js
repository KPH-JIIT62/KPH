const { Router } = require("express");

function createAdminRouter(controller) {
  const router = Router();

  // Contests
  router.get("/contests", controller.listContests);
  router.post("/contests", controller.createContest);
  router.patch("/contests/:slug", controller.updateContest);
  router.delete("/contests/:slug", controller.deleteContest);
  router.get("/contests/:slug/registrations", controller.getContestRegistrations);
  router.get("/contests/:slug/leaderboard", controller.getLeaderboard);
  router.post("/contests/:slug/leaderboard", controller.publishLeaderboard);
  router.delete("/contests/:slug/leaderboard", controller.deleteLeaderboard);
  router.get("/contests/:slug/gallery", controller.getContestGallery);
  router.put("/contests/:slug/gallery", controller.updateContestGallery);
  router.post("/contests/:slug/gallery/upload", controller.uploadContestGalleryImages);
  router.delete("/contests/:slug/gallery/:imageId", controller.deleteContestGalleryImage);

  // Certificates & Leaderboard
  router.post("/certificates/preview", controller.previewLeaderboard);
  router.post("/certificates/generate", controller.generateCertificates);
  router.post("/certificates/send-email", controller.sendCertificatesEmail);
  router.get("/certificates/pdf/:filename", controller.getCertificatePdf);

  // Admin Access Identifiers
  router.get("/access", controller.listAdminAccess);
  router.post("/access", controller.addAdminAccess);
  router.delete("/access/:id", controller.removeAdminAccess);

  // Team Showcase Management
  router.get("/team", controller.listTeamMembers);
  router.get("/team/years", controller.listTeamYears);
  router.post("/team/years", controller.createTeamYear);
  router.post("/team", controller.createTeamMember);
  router.post("/team/upload", controller.uploadTeamImage);
  router.patch("/team/:id", controller.updateTeamMember);
  router.delete("/team/:id", controller.deleteTeamMember);

  return router;
}

module.exports = { createAdminRouter };

