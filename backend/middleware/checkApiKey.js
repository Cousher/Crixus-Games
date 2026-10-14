const crypto = require("crypto");

const checkApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.API_KEY;

  if (typeof apiKey !== "string" || typeof expectedKey !== "string" || !expectedKey) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const actualBuf = Buffer.from(apiKey);
  const expectedBuf = Buffer.from(expectedKey);

  if (
    actualBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(actualBuf, expectedBuf)
  ) {
    return next();
  }

  return res.status(403).json({ error: "Forbidden" });
};

module.exports = checkApiKey;

