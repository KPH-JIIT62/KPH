// Builds the Express app. Everything it needs is passed IN (env, pool, verifyToken) instead of
// being imported, so tests can plug in a fake token verifier and a test database.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { authenticate } = require("./middleware/authenticate");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { createUserService } = require("./services/userService");
const { createUsersController } = require("./controllers/usersController");
const { createUsersRouter } = require("./routes/users");
const { createContestService } = require("./services/contestService");
const { createContestsController } = require("./controllers/contestsController");
const { createContestsRouter } = require("./routes/contests");

function createApp({ env, pool, verifyToken }) {
  const userService = createUserService(pool);
  const app = express();

  app.use(helmet()); // sensible security headers
  app.use(
    cors({
      // CORS tells the BROWSER which websites may call this API. Other origins get no CORS headers and are blocked.
      origin: (origin, callback) => callback(null, !origin || env.corsOrigins.includes(origin)),
      methods: ["GET", "PUT", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Authorization", "Content-Type"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "10kb" })); // turns JSON bodies into req.body; rejects oversized ones

  app.get("/api/health", (req, res) => res.json({ ok: true, service: "kph-api" })); // public

  const requireLogin = authenticate({ verifyToken, userService, allowedEmailDomain: env.allowedEmailDomain });
  app.use("/api/users", requireLogin, createUsersRouter(createUsersController(userService)));
  const contestService = createContestService(pool, userService);
  app.use("/api/contests", requireLogin, createContestsRouter(createContestsController(contestService)));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
