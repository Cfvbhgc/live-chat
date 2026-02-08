/**
 * Central error-handling middleware for Express.
 *
 * Express recognises a middleware as an error handler when its signature has
 * exactly four parameters (err, req, res, next). We register this after all
 * route definitions so that any error thrown or passed via `next(err)` in a
 * route handler ends up here instead of crashing the process.
 *
 * The handler tries to distinguish between known operational errors (like
 * Mongoose validation failures or bad ObjectIds) and unexpected programming
 * bugs. For known errors we send back a structured JSON response with a
 * meaningful message; for everything else we fall back to a generic 500 so
 * that internal details are not leaked to the client.
 */

// eslint-disable-next-line no-unused-vars -- Express requires the `next` param
// to recognise this as an error handler even though we never call it.
const errorHandler = (err, req, res, next) => {
  // Log the full error on the server side so we can investigate later.
  // In production you would pipe this to a structured logging service, but
  // console.error is perfectly fine for a demo project.
  console.error(`[error] ${err.message}`);

  // Mongoose validation errors happen when a document fails schema checks
  // (missing required fields, values outside enum, etc.). We collect all
  // individual field errors into a flat object so the client can display
  // them next to the corresponding form inputs.
  if (err.name === "ValidationError") {
    const fields = {};
    for (const key of Object.keys(err.errors)) {
      fields[key] = err.errors[key].message;
    }

    return res.status(400).json({
      error: "Validation failed",
      fields,
    });
  }

  // A CastError with kind "ObjectId" means the client passed a string that
  // does not look like a valid Mongo ObjectId (24-character hex string). This
  // typically happens when someone types a random ID into the URL bar.
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({
      error: "Invalid ID format",
    });
  }

  // Duplicate key errors surface as a MongoServerError with code 11000.
  // The most common trigger is trying to create a user or room with a name
  // that already exists.
  if (err.code === 11000) {
    const duplicatedField = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: `A record with that ${duplicatedField} already exists`,
    });
  }

  // Anything else is treated as an unexpected internal error.
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal server error" : err.message,
  });
};

export default errorHandler;
