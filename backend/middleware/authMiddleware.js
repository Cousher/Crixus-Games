const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/User");
const { extractRequestToken } = require("../utils/authCookie");

const isAuthenticated = async (req, res, next) => {
  const { token, source } = extractRequestToken(req);

  if (source === "invalid_bearer") {
    return res.status(401).json({ message: "Invalid Authorization" });
  }
  if (!token) {
    return res.status(401).json({ message: "No authorization token provided" });
  }

  // Verify the token (pin HS256 to prevent algorithm confusion)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Token is not valid" });
    }

    // Immediate session revocation check via tokenVersion
    const userTv = typeof user.tokenVersion === "number" ? user.tokenVersion : 0;
    const tokenTv = typeof decoded.tv === "number" ? decoded.tv : 0;
    if (tokenTv !== userTv) {
      return res.status(401).json({ message: "Session has been revoked" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: "Access denied" });
  }
};

module.exports = {
  isAuthenticated,
  isAdmin,
};
