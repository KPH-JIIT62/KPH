const { HttpError } = require("../utils/HttpError");

// Slugs look like "interview-talks-by-seniors". Anything else cannot exist, so answer 404 without touching the database.
const SLUG = /^[a-z0-9-]{1,60}$/;
const slugOf = (req) => {
  if (!SLUG.test(req.params.slug)) throw new HttpError(404, "SESSION_NOT_FOUND", "Session not found.");
  return req.params.slug;
};

function createSessionsController(sessionService) {
  return {
    // GET /api/sessions
    async list(req, res) {
      res.json({ sessions: await sessionService.listForUser(req.user.id) });
    },
    // GET /api/sessions/:slug
    async get(req, res) {
      res.json(await sessionService.getForUser(slugOf(req), req.user.id));
    },
    // POST /api/sessions/:slug/registrations
    // The request needs no body: who is registering comes from the signed-in user's saved profile.
    // The ONLY thing read from a body is a "yearOfStudy", and only to REFUSE it when it differs from the profile's.
    async register(req, res) {
      const slug = slugOf(req);
      const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
      const { registration } = await sessionService.register(req.user.id, slug, { claimedYearOfStudy: body.yearOfStudy });
      res.status(201).json({ registration });
    },
    // Questions are accepted from any signed-in account, regardless of session registration.
    async askQuestion(req, res) {
      const slug = slugOf(req);
      const input = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
      const question = typeof input.question === "string" ? input.question.trim() : "";
      if (!question) throw new HttpError(400, "QUESTION_REQUIRED", "Write a question before submitting.");
      if (question.length > 5000) throw new HttpError(400, "QUESTION_TOO_LONG", "Questions must be 5,000 characters or fewer.");
      const result = await sessionService.askQuestion(req.user.id, slug, question);
      res.status(201).json({ question: result });
    },
  };
}

module.exports = { createSessionsController };
