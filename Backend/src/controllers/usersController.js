// A controller translates HTTP <-> our code: read the request, call the service, shape the response.
const { HttpError } = require("../utils/HttpError");
const { validateProfile } = require("../validation/profile");

function createUsersController(userService) {
  return {
    // GET /api/users/me
    async getMe(req, res) {
      res.json({ user: await userService.toPublic(req.user) });
    },

    // PUT /api/users/me/profile
    async updateMyProfile(req, res) {
      // If we already know the enrollment number (from the college email), the form is not allowed to change it.
      const result = validateProfile(req.body, { enrollmentFixed: Boolean(req.user.enrollment_no) });
      if (!result.ok) {
        throw new HttpError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", result.fields);
      }
      // Branch is derived here on the server from enrollment number + batch; it is never read from the request.
      const toSave = userService.prepareProfileUpdate(req.user, result.value);
      // req.user.id comes from the verified token (see authenticate.js), never from the body or URL.
      const row = await userService.updateProfile(req.user.id, toSave);
      res.json({ user: await userService.toPublic(row) });
    },
  };
}

module.exports = { createUsersController };
