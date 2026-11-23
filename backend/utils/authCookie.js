const jwt = require("jsonwebtoken");

const SESSION_COOKIE_NAME = "crixus_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FORBIDDEN_COOKIE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Safely parses an HTTP Cookie header into a null-prototype dictionary.
 */
function parseCookies(cookieHeader) {
  const cookies = Object.create(null);
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) {
    return cookies;
  }
  const pairs = cookieHeader.split(";");
  for (const rawPair of pairs) {
    const eqIndex = rawPair.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = rawPair.slice(0, eqIndex).trim();
    if (!key || FORBIDDEN_COOKIE_KEYS.has(key)) continue;
    const rawVal = rawPair.slice(eqIndex + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawVal);
    } catch {
      cookies[key] = rawVal;
    }
  }
  return cookies;
}

/**
 * Builds cookie options for the HttpOnly session cookie.
 * Uses `Secure` in production or whenever the request arrived over HTTPS
 * (direct TLS or via Nginx X-Forwarded-Proto: https), while remaining usable
 * on http://localhost during local development.
 */
function getSessionCookieOptions(req, { includeMaxAge = true } = {}) {
  const isProd = process.env.NODE_ENV === "production";
  const forwardedProto =
    req && req.headers && typeof req.headers["x-forwarded-proto"] === "string"
      ? req.headers["x-forwarded-proto"].split(",")[0].trim().toLowerCase()
      : "";
  const isSecure = isProd || Boolean(req && req.secure) || forwardedProto === "https";

  const opts = {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
  };
  if (includeMaxAge) {
    opts.maxAge = SESSION_TTL_MS;
  }
  return opts;
}

/**
 * Signs a session JWT bound to both userId and the user's current tokenVersion
 * so incrementing tokenVersion immediately revokes all existing sessions.
 */
function signSessionToken(user) {
  const userId = (user._id || user.id).toString();
  const tv = typeof user.tokenVersion === "number" ? user.tokenVersion : 0;
  return jwt.sign({ userId, tv }, process.env.JWT_SECRET, {
    expiresIn: "30d",
    algorithm: "HS256",
  });
}

function setSessionCookie(res, req, token) {
  res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions(req, { includeMaxAge: true }));
}

function clearSessionCookie(res, req) {
  res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions(req, { includeMaxAge: false }));
}

/**
 * Extracts a JWT from an Express request: prefers the HttpOnly session cookie,
 * falling back to `Authorization: Bearer <token>` for standalone admin tools
 * and automated API tests.
 */
function extractRequestToken(req) {
  const cookies = parseCookies(req && req.headers && req.headers.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return { token: cookieToken, source: "cookie" };
  }

  const authHeader = req && typeof req.header === "function"
    ? req.header("Authorization")
    : req && req.headers && req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.length > 0) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer" && parts[1]) {
      return { token: parts[1], source: "bearer" };
    }
    return { token: null, source: "invalid_bearer" };
  }

  return { token: null, source: null };
}

/**
 * Extracts a JWT from a Socket.io handshake: prefers the HttpOnly cookie sent
 * on the upgrade/polling request, falling back to `handshake.auth.token`.
 */
function extractSocketToken(socket) {
  const cookieHeader = socket && socket.handshake && socket.handshake.headers && socket.handshake.headers.cookie;
  const cookies = parseCookies(cookieHeader);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }
  const authToken = socket && socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }
  return null;
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  parseCookies,
  getSessionCookieOptions,
  signSessionToken,
  setSessionCookie,
  clearSessionCookie,
  extractRequestToken,
  extractSocketToken,
};
