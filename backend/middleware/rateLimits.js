const rateLimit = require("express-rate-limit");

// Rate limits for abuse-prone endpoints.
// NOTE: index.js sets `trust proxy` to loopback so req.ip is the real client
// IP when Nginx forwards the request (and can't be spoofed by direct callers).

// Login / register / google login: brute-force and account-farming protection (per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

// Faucets (bonus, streak, missions, level rewards): keyed per user so players
// behind the same NAT/Wi-Fi don't block each other. Must run AFTER isAuthenticated.
const rewardsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user._id ? `u:${req.user._id}` : `ip:${req.ip}`),
  message: { message: "Too many requests, slow down" },
});

module.exports = { authLimiter, rewardsLimiter };
