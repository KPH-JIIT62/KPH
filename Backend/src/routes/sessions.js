const { Router } = require("express");

function createSessionsRouter(controller) {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:slug", controller.get);
  router.post("/:slug/registrations", controller.register);
  router.post("/:slug/questions", controller.askQuestion);
  return router;
}

module.exports = { createSessionsRouter };
