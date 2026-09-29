const express = require("express");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { HttpError } = require("./errors");

const ALLOWED = new Set([
  "pdf", "png", "jpg", "jpeg", "gif", "webp", "zip",
  "cpp", "cc", "cxx", "c", "h", "hpp", "py", "java", "js", "ts", "txt", "md", "rs", "go", "json", "csv",
]);

function kindFor(ext) {
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "zip") return "zip";
  if (["cpp", "cc", "cxx", "c", "h", "hpp", "py", "java", "js", "ts", "rs", "go"].includes(ext)) return "code";
  return "file";
}

function createRouter(store, { uploadsDir }) {
  const router = express.Router();
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const base = path
          .basename(file.originalname, path.extname(file.originalname))
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .slice(0, 40);
        cb(null, `${Date.now()}-${crypto.randomBytes(3).toString("hex")}-${base}${ext}`);
      },
    }),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
      if (!ALLOWED.has(ext)) return cb(new HttpError(400, "That file type is not supported"));
      cb(null, true);
    },
  });

  const wrap = (fn) => (req, res, next) => {
    try {
      fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  router.get("/health", (req, res) => {
    res.json({ ok: true, service: "coding-hub" });
  });

  router.use((req, res, next) => {
    const user = store.getUser(req.header("x-user-id") || "u-saurav");
    if (!user) return res.status(401).json({ error: "Unknown user" });
    req.user = user;
    next();
  });

  router.get("/bootstrap", wrap((req, res) => res.json(store.bootstrap(req.user.id))));
  router.get("/inbox", wrap((req, res) => res.json(store.inbox(req.user.id))));

  router.get("/channels/:channelId/messages", wrap((req, res) => {
    res.json({ messages: store.channelMessages(req.user.id, req.params.channelId) });
  }));
  router.post("/channels/:channelId/messages", wrap((req, res) => {
    res.status(201).json({ message: store.createChannelMessage(req.user.id, req.params.channelId, req.body || {}) });
  }));
  router.post("/channels/:channelId/read", wrap((req, res) => {
    res.json(store.markChannelRead(req.user.id, req.params.channelId));
  }));
  router.post("/channels", wrap((req, res) => {
    res.status(201).json({ channel: store.createChannel(req.user.id, req.body || {}) });
  }));

  router.get("/conversations", wrap((req, res) => {
    res.json({ conversations: store.bootstrap(req.user.id).conversations });
  }));
  router.post("/conversations", wrap((req, res) => {
    res.status(201).json({ conversation: store.createDirect(req.user.id, req.body?.userId) });
  }));
  router.get("/conversations/:conversationId/messages", wrap((req, res) => {
    res.json({ messages: store.conversationMessages(req.user.id, req.params.conversationId) });
  }));
  router.post("/conversations/:conversationId/messages", wrap((req, res) => {
    res.status(201).json({
      message: store.createConversationMessage(req.user.id, req.params.conversationId, req.body || {}),
    });
  }));
  router.post("/conversations/:conversationId/read", wrap((req, res) => {
    res.json(store.markConversationRead(req.user.id, req.params.conversationId));
  }));

  router.get("/messages/:messageId", wrap((req, res) => {
    res.json(store.getThread(req.user.id, req.params.messageId));
  }));
  router.post("/messages/:messageId/replies", wrap((req, res) => {
    res.status(201).json(store.createReply(req.user.id, req.params.messageId, req.body || {}));
  }));
  router.post("/messages/:messageId/reactions", wrap((req, res) => {
    res.json({ message: store.toggleReaction(req.user.id, req.params.messageId, req.body?.emoji) });
  }));
  router.post("/messages/:messageId/vote", wrap((req, res) => {
    res.json({ message: store.vote(req.user.id, req.params.messageId, req.body?.optionIds) });
  }));
  router.post("/messages/:messageId/pin", wrap((req, res) => {
    res.json({ message: store.setPin(req.user.id, req.params.messageId, req.body?.pinned !== false) });
  }));
  router.delete("/messages/:messageId", wrap((req, res) => {
    res.json({ message: store.deleteMessage(req.user.id, req.params.messageId) });
  }));

  router.get("/bookmarks", wrap((req, res) => {
    res.json({ bookmarks: store.listBookmarks(req.user.id) });
  }));
  router.post("/bookmarks", wrap((req, res) => {
    res.status(201).json({ bookmarks: store.addBookmark(req.user.id, req.body?.messageId) });
  }));
  router.delete("/bookmarks/:messageId", wrap((req, res) => {
    res.json({ bookmarks: store.removeBookmark(req.user.id, req.params.messageId) });
  }));

  router.get("/search", wrap((req, res) => {
    res.json(store.search(req.user.id, req.query));
  }));

  router.post("/notifications/read", wrap((req, res) => {
    res.json({ notifications: store.markNotificationsRead(req.user.id, req.body?.id || null) });
  }));

  router.post("/uploads", (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (error) return next(error.code === "LIMIT_FILE_SIZE" ? new HttpError(400, "File is larger than 8 MB") : error);
      if (!req.file) return next(new HttpError(400, "Choose a file"));
      const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
      const name = path.basename(req.file.originalname).replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 140);
      res.status(201).json({
        attachment: {
          id: `a_${crypto.randomBytes(4).toString("hex")}`,
          name,
          mime: req.file.mimetype,
          size: req.file.size,
          url: `/uploads/${req.file.filename}`,
          kind: kindFor(ext),
        },
      });
    });
  });

  router.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return router;
}

module.exports = { createRouter };
