// Routes map "METHOD + URL" to a controller function. Mounted at /api/users in app.js.
const { Router } = require("express");

function createUsersRouter(controller) {
  const router = Router();
  router.get("/me", controller.getMe);
  router.put("/me/profile", controller.updateMyProfile);
  return router;
}

module.exports = { createUsersRouter };
