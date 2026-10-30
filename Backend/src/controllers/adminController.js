const { HttpError } = require("../utils/HttpError");

function createAdminController(adminService) {
  return {
    // -------------------------------------------------------------
    // CONTESTS
    // -------------------------------------------------------------
    async listContests(req, res) {
      res.json({ contests: await adminService.listContests() });
    },

    async createContest(req, res) {
      const contest = await adminService.createContest(req.body || {});
      res.status(201).json({ contest });
    },

    async updateContest(req, res) {
      const { slug } = req.params;
      const contest = await adminService.updateContest(slug, req.body || {});
      res.json({ contest });
    },

    async deleteContest(req, res) {
      const { slug } = req.params;
      res.json(await adminService.deleteContest(slug));
    },

    async getContestRegistrations(req, res) {
      const { slug } = req.params;
      res.json(await adminService.getContestRegistrations(slug));
    },

    // -------------------------------------------------------------
    // LEADERBOARD & CERTIFICATES
    // -------------------------------------------------------------
    async previewLeaderboard(req, res) {
      const content = req.body?.data || req.body?.content || req.body;
      if (!content) {
        throw new HttpError(400, "MISSING_DATA", "Please provide leaderboard data.");
      }
      res.json(await adminService.previewLeaderboard(content));
    },

    async publishLeaderboard(req, res) {
      const { slug } = req.params;
      const data = req.body?.data || req.body?.leaderboard || req.body;
      if (!data) {
        throw new HttpError(400, "MISSING_DATA", "Please provide leaderboard data.");
      }
      res.json(await adminService.publishLeaderboard(slug, data, req.user?.id));
    },

    async getLeaderboard(req, res) {
      const { slug } = req.params;
      res.json(await adminService.getLeaderboard(slug));
    },

    async deleteLeaderboard(req, res) {
      const { slug } = req.params;
      res.json(await adminService.deleteLeaderboard(slug));
    },

    async generateCertificates(req, res) {
      const { contestSlug, customTitle, date, recipients } = req.body || {};
      res.json(await adminService.generateCertificates({
        contestSlug,
        customTitle,
        date,
        recipients,
      }));
    },

    async sendCertificatesEmail(req, res) {
      const { contestSlug, customTitle, certificates } = req.body || {};
      res.json(await adminService.sendCertificatesEmail({
        contestSlug,
        customTitle,
        certificates,
      }));
    },

    async getCertificatePdf(req, res) {
      const { filename } = req.params;
      const filePath = await adminService.getCertificatePdfPath(filename);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.sendFile(filePath);
    },

    // -------------------------------------------------------------
    // ADMIN ACCESS IDS
    // -------------------------------------------------------------
    async listAdminAccess(req, res) {
      res.json({ admins: await adminService.listAdminAccess() });
    },

    async addAdminAccess(req, res) {
      const { identifier, note } = req.body || {};
      const record = await adminService.addAdminAccess({ identifier, note });
      res.status(201).json({ admin: record });
    },

    async removeAdminAccess(req, res) {
      const { id } = req.params;
      res.json(await adminService.removeAdminAccess(id, req.user?.email));
    },
  };
}

module.exports = { createAdminController };

