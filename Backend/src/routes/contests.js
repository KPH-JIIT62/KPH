const { Router } = require("express");

function createContestsRouter(controller) {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:slug", controller.get);
  router.post("/:slug/registrations", controller.register);
  router.delete("/:slug/registrations/me", controller.withdraw);
  return router;
}

module.exports = { createContestsRouter };
