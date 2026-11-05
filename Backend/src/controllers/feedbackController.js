"use strict";

function createFeedbackController(feedbackService) {
  return {
    async submitFeedback(req, res) {
      const result = await feedbackService.submitFeedback({
        user: req.user,
        feedbackType: req.body?.feedbackType,
        rating: req.body?.rating,
        message: req.body?.message,
      });
      res.status(201).json(result);
    },
  };
}

module.exports = { createFeedbackController };

