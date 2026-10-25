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
    // GET /api/contests/:slug/leaderboard
    async getLeaderboard(req, res) {
      res.json(await contestService.getLeaderboard(slugOf(req)));
    },
    async searchMember(req, res) {
      const slug = slugOf(req);
      res.json(await contestService.searchMember(req.user.id, slug, req.query.enrollmentNo));
    },
    async registerTeam(req, res) {
      const slug = slugOf(req);
      const input = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
      const teamName = typeof input.teamName === "string" ? input.teamName.trim() : "";
      const hackerrankHandle = typeof input.hackerrankHandle === "string" ? input.hackerrankHandle.trim() : "";
      const memberIds = Array.isArray(input.memberIds) ? input.memberIds : [];
      const fields = {};
      if (teamName && teamName.length > 80) fields.teamName = "Team name must be 80 characters or fewer.";
      if (hackerrankHandle && hackerrankHandle.length > 80) fields.hackerrankHandle = "HackerRank ID must be 80 characters or fewer.";
      if (memberIds.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) fields.members = "Invalid member format.";
      if (memberIds.length > 5) fields.members = "You can add up to 5 additional members (6 total).";
      if (Object.keys(fields).length) throw new HttpError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", fields);
      const registration = await contestService.registerTeam(req.user.id, slug, { teamName, hackerrankHandle, memberIds });
      const { user, ...publicRegistration } = registration;
      res.status(201).json({ registration: publicRegistration, ...(user ? { user } : {}) });
    },
    // POST /api/contests/:slug/registrations
    async register(req, res) {
      const slug = slugOf(req);
      const result = validateRegistration(req.body);
      if (!result.ok) throw new HttpError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", result.fields);
      const { registration, user } = await contestService.register(req.user.id, slug, result.value);
      res.status(201).json({ registration, user: await userService.toPublic(user) });
    },
    // DELETE /api/contests/:slug/registrations/me   (the signed-in person withdraws THEIR OWN registration)
    async withdraw(req, res) {
      await contestService.withdraw(req.user.id, slugOf(req));
      res.json({ withdrawn: true });
    },
  };
}

module.exports = { createContestsController };
