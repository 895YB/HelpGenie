import { authService } from '../services/auth.service.js';
import ApiResponse from '../utils/apiResponse.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth',
};

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, COOKIE_OPTIONS);
}

function clearRefreshCookie(res) {
  res.cookie('refreshToken', '', { ...COOKIE_OPTIONS, maxAge: 0 });
}

function getUserAgent(req) {
  return req.headers['user-agent'] || null;
}

// ── Handlers ─────────────────────────────────────────────────

export async function register(req, res, next) {
  try {
    const { name, email, password, companyName } = req.body;
    const result = await authService.register(
      { name, email, password, companyName },
      getUserAgent(req)
    );

    setRefreshCookie(res, result.refreshToken);

    return ApiResponse.created(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Account created successfully');
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(
      { email, password },
      getUserAgent(req)
    );

    setRefreshCookie(res, result.refreshToken);

    return ApiResponse.success(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Logged in successfully');
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    const result = await authService.refreshTokens(rawToken, getUserAgent(req));

    setRefreshCookie(res, result.refreshToken);

    return ApiResponse.success(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    await authService.logout(req.userId, rawToken);
    clearRefreshCookie(res);
    return ApiResponse.success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

export async function logoutAll(req, res, next) {
  try {
    await authService.logoutAll(req.userId);
    clearRefreshCookie(res);
    return ApiResponse.success(res, null, 'Logged out from all devices');
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    await authService.forgotPassword(req.body.email);
    // Always return the same message to prevent user enumeration
    return ApiResponse.success(
      res,
      null,
      'If an account with that email exists, a reset link has been sent.'
    );
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const user = await authService.resetPassword(
      req.params.token,
      req.body.password
    );
    return ApiResponse.success(res, { user }, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const user = await authService.verifyEmail(req.params.token);
    return ApiResponse.success(res, { user }, 'Email verified successfully');
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.userId);
    return ApiResponse.success(res, { user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, password } = req.body;
    const user = await authService.changePassword(
      req.userId,
      currentPassword,
      password
    );
    clearRefreshCookie(res);
    return ApiResponse.success(res, { user }, 'Password changed. Please log in again.');
  } catch (err) {
    next(err);
  }
}
