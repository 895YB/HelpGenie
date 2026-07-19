import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const { AppError, default: errorMiddleware } = await import('../../src/middleware/error.middleware.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorMiddleware', () => {
  it('formats an AppError using its statusCode and message', () => {
    const err = AppError.notFound('Widget not found');
    const res = mockRes();
    errorMiddleware(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Widget not found' });
  });

  it('includes field errors when present (e.g. validation failures)', () => {
    const err = AppError.badRequest('Validation failed', [{ field: 'email', message: 'Invalid' }]);
    const res = mockRes();
    errorMiddleware(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'email', message: 'Invalid' }],
    });
  });

  it('translates a Mongoose duplicate-key error into a 409 conflict', () => {
    const err = Object.assign(new Error('E11000 duplicate'), {
      code: 11000,
      keyValue: { widgetId: 'wid_1' },
    });
    const res = mockRes();
    errorMiddleware(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('widgetId') })
    );
  });

  it('hides the detail of an unexpected (non-operational) error behind a generic 500', () => {
    const err = new Error('something exploded');
    const res = mockRes();
    errorMiddleware(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  });
});
