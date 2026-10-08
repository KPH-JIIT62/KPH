const { HttpError } = require("../utils/HttpError");
const { validateRegistration } = require("../validation/registration");

// Slugs look like "encode-26-2". Anything else cannot exist, so answer 404 without touching the database.
const SLUG = /^[a-z0-9-]{1,60}$/;
const slugOf = (req) => {
  if (!SLUG.test(req.params.slug)) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
  return req.params.slug;
};

function createContestsController(contestService, userService) {
  return {
    // GET /api/contests
    async list(req, res) {
      res.json({ contests: await contestService.listForUser(req.user.id) });
    },
    // GET /api/contests/:slug
    async get(req, res) {
      res.json(await contestService.getForUser(slugOf(req), req.user.id));
    },
    // POST /api/contests/:slug/registrations
    async register(req, res) {
      const slug = slugOf(req);
      const result = validateRegistration(req.body);
      if (!result.ok) throw new HttpError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", result.fields);
      const { registration, user } = await contestService.register(req.user.id, slug, result.value);
      res.status(201).json({ registration, user: userService.toPublic(user) });
    },
  };
}

module.exports = { createContestsController };
