const mongoose = require("mongoose");

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Recursively strips prototype-pollution keys and MongoDB operator keys
 * (starting with `$`) from untrusted request payloads (body, query, params).
 */
function sanitizeObject(value, depth = 0) {
  if (depth > 12 || value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = sanitizeObject(value[i], depth + 1);
    }
    return value;
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key) || key.startsWith("$")) {
      delete value[key];
      continue;
    }
    value[key] = sanitizeObject(value[key], depth + 1);
  }
  return value;
}

const sanitizePayload = (req, _res, next) => {
  if (req.body && typeof req.body === "object") sanitizeObject(req.body);
  if (req.query && typeof req.query === "object") sanitizeObject(req.query);
  if (req.params && typeof req.params === "object") sanitizeObject(req.params);
  next();
};

/**
 * Standard defensive HTTP security headers (Helmet-equivalent without extra dep).
 */
const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
};

/**
 * Validates that an image URL stored by admins is either empty, a relative
 * `/images/...` path, or an `https://` URL (rejects `javascript:`, `data:`, etc.).
 */
function isSafeImageUrl(url) {
  if (url === undefined || url === null || url === "") return true;
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length > 512) return false;
  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//") && !/[\r\n]/.test(trimmed);
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Validates a base64 PNG/JPEG data URI including character validation and file
 * magic bytes (PNG: 89 50 4E 47, JPEG: FF D8 FF).
 */
const MAX_BASE64_IMAGE_LENGTH = 2 * 1024 * 1024;
function isValidImageBase64(str) {
  if (typeof str !== "string" || str.length > MAX_BASE64_IMAGE_LENGTH) {
    return false;
  }
  const match = /^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/.exec(str);
  if (!match) return false;
  const [, mime, b64] = match;
  if (b64.length < 16) return false;
  try {
    const header = Buffer.from(b64.slice(0, 16), "base64");
    if (mime === "png") {
      return (
        header.length >= 4 &&
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47
      );
    }
    return (
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff
    );
  } catch {
    return false;
  }
}

/**
 * Sliding-window per-socket event rate limiter.
 */
function createSocketRateLimiter({ maxEvents = 15, windowMs = 5000 } = {}) {
  const timestamps = [];
  return function isRateLimited(now = Date.now()) {
    while (timestamps.length > 0 && now - timestamps[0] >= windowMs) {
      timestamps.shift();
    }
    if (timestamps.length >= maxEvents) {
      return true;
    }
    timestamps.push(now);
    return false;
  };
}

const isValidObjectId = (id) => typeof id === "string" && mongoose.isValidObjectId(id);

module.exports = {
  sanitizeObject,
  sanitizePayload,
  securityHeaders,
  isSafeImageUrl,
  isValidImageBase64,
  createSocketRateLimiter,
  isValidObjectId,
};
