import logger from '../utils/logger.js';

/**
 * Custom error class.
 * Throw this anywhere in the service/controller layer;
 * the global handler below formats it into the API response shape.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;   // distinguishes known errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = null) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message) {
    return new AppError(message, 409);
  }

  static tooMany(message = 'Too many requests') {
    return new AppError(message, 429);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}

// ── Specific Mongoose / JWT error translators ────────────────

function handleCastError(err) {
  return new AppError(`Invalid value for field: ${err.path}`, 400);
}

function handleDuplicateKey(err) {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue?.[field];
  return new AppError(`${field} '${value}' is already in use`, 409);
}

function handleValidationError(err) {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return new AppError('Validation failed', 400, errors);
}

function handleJWTError() {
  return new AppError('Invalid token — please log in again', 401);
}

function handleJWTExpired() {
  return new AppError('Token has expired — please log in again', 401);
}

// ── Global error handler — must be last app.use() ────────────
export default function errorMiddleware(err, _req, res, _next) {
  let error = err;

  // Translate known library errors into AppErrors
  if (err.name === 'CastError') error = handleCastError(err);
  else if (err.code === 11000) error = handleDuplicateKey(err);
  else if (err.name === 'ValidationError') error = handleValidationError(err);
  else if (err.name === 'JsonWebTokenError') error = handleJWTError();
  else if (err.name === 'TokenExpiredError') error = handleJWTExpired();

  // Non-operational errors are bugs — log and hide the detail from the client
  if (!error.isOperational) {
    logger.error('Unhandled error:', { message: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }

  logger.warn(`[${error.statusCode}] ${error.message}`);

  const body = { success: false, message: error.message };
  if (error.errors) body.errors = error.errors;

  return res.status(error.statusCode).json(body);
}
