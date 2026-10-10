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
  };
}

module.exports = { createSessionsController };
