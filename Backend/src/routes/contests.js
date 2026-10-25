const { Router } = require("express");

function createContestsRouter(controller) {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:slug", controller.get);
  router.get("/:slug/leaderboard", controller.getLeaderboard);
  router.get("/:slug/member-search", controller.searchMember);
  router.post("/:slug/registrations", controller.register);
  router.post("/:slug/teams", controller.registerTeam);
  router.delete("/:slug/registrations/me", controller.withdraw);
  return router;
}

module.exports = { createContestsRouter };
