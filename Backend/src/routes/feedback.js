"use strict";

const express = require("express");

function createFeedbackRouter(controller) {
  const router = express.Router();

  router.post("/", controller.submitFeedback);

  return router;
}

module.exports = { createFeedbackRouter };

