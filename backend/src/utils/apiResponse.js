/**
 * Consistent JSON response shape for every endpoint.
 *
 *  Success:  { success: true,  message, data, [pagination] }
 *  Error:    { success: false, message, [errors] }
 */
class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
  }

  static created(res, data, message = 'Created successfully') {
    return res.status(201).json({ success: true, message, data });
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({ success: true, message, data, pagination });
  }

  static error(res, message, statusCode = 400, errors = null) {
    const body = { success: false, message };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static serverError(res, message = 'Internal server error') {
    return this.error(res, message, 500);
  }
}

export default ApiResponse;
