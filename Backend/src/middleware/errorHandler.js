const { HttpError } = require("../utils/HttpError");

function notFound(req, res) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` } });
}

// Express recognises error handlers by their 4 parameters. EVERY error ends up here,
// so every error response has the same shape: { error: { code, message, fields? } }.
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message, fields: error.fields } });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON." } });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: { code: "BODY_TOO_LARGE", message: "Request body is too large." } });
  }
  console.error(error); // full detail goes to OUR logs, never to the client
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side." } });
}

module.exports = { notFound, errorHandler };
