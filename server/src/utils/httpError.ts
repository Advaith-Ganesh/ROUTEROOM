export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new HttpError(401, message);
  }
  static forbidden(message = 'You do not have permission to do this') {
    return new HttpError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new HttpError(404, message);
  }
  static conflict(message: string) {
    return new HttpError(409, message);
  }
  static badGateway(message: string) {
    return new HttpError(502, message);
  }
}
