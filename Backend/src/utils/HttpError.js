// An error that carries the HTTP status code to answer with.
// Anything that is NOT an HttpError is treated as an unexpected bug (500).
class HttpError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code; // stable machine-readable code, e.g. "VALIDATION_ERROR"
    this.fields = fields; // optional { fieldName: "what is wrong" }
  }
}

module.exports = { HttpError };
