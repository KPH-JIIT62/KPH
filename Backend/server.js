const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { openStore } = require("./src/store");
const { createRouter } = require("./src/routes");
const { HttpError } = require("./src/errors");

const dataFile = process.env.KPH_DATA || path.join(__dirname, "data", "db.json");
const uploadsDir = process.env.KPH_UPLOADS || path.join(__dirname, "uploads");
const distDir = path.join(__dirname, "..", "Frontend", "dist");
const distIndex = path.join(distDir, "index.html");

function createApp() {
  const app = express();
  const store = openStore({ dataFile, uploadsDir });
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed"));
      },
    })
  );
  app.use("/api", createRouter(store, { uploadsDir }));
  app.use("/uploads", express.static(uploadsDir));

  if (fs.existsSync(distIndex)) {
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (path.extname(req.path) && path.extname(req.path) !== ".html") return res.status(404).end();
      res.sendFile(distIndex);
    });
  } else {
    app.get("/", (req, res) => {
      res.json({
        ok: true,
        service: "coding-hub",
        hint: "API is up. Build the frontend, then open this server again.",
      });
    });
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof HttpError ? error.status : error.status || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: status >= 500 ? "Something went wrong" : error.message });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 5000;
  createApp().listen(port, () => {
    console.log(`Coding Hub running at http://localhost:${port}`);
    if (!fs.existsSync(distIndex)) {
      console.log("Frontend build not found. API is available at /api. From the repo root, run: npm start");
    }
  });
}

module.exports = { createApp };
