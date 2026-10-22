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
    async searchMember(req, res) {
      if (slugOf(req) !== "execute-26-4") throw new HttpError(404, "NOT_FOUND", "Not found.");
      res.json(await contestService.searchMember(req.user.id, req.query.enrollmentNo));
    },
    async registerTeam(req, res) {
      if (slugOf(req) !== "execute-26-4") throw new HttpError(404, "NOT_FOUND", "Not found.");
      const input = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
      const teamName = typeof input.teamName === "string" ? input.teamName.trim() : "";
      const hackerrankHandle = typeof input.hackerrankHandle === "string" ? input.hackerrankHandle.trim() : "";
      const memberIds = input.memberIds;
      const fields = {};
      if (!teamName) fields.teamName = "Team name is required.";
      else if (teamName.length > 80) fields.teamName = "Team name must be 80 characters or fewer.";
      if (!hackerrankHandle) fields.hackerrankHandle = "Team HackerRank ID is required.";
      else if (hackerrankHandle.length > 80) fields.hackerrankHandle = "HackerRank ID must be 80 characters or fewer.";
      if (!Array.isArray(memberIds) || memberIds.length > 2 || memberIds.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) fields.members = "Choose up to two valid KPH members.";
      if (Object.keys(fields).length) throw new HttpError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", fields);
      res.status(201).json({ registration: await contestService.registerTeam(req.user.id, "execute-26-4", { teamName, hackerrankHandle, memberIds }) });
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
