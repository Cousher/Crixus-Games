const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const path = require("path");
const fs = require("fs");
const socketIO = require("socket.io");
const cronJobs = require("./tasks/cronJobs");
const checkApiKey = require("./middleware/checkApiKey");
const { securityHeaders, sanitizePayload, createSocketRateLimiter } = require("./middleware/security");
const { extractSocketToken } = require("./utils/authCookie");
const User = require("./models/User");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const { runMigrations } = require("./migrations/runner");

require("dotenv").config();

const app = express();
app.disable("x-powered-by");
app.use(securityHeaders);
const server = http.createServer(app);

// deploy webhook is mounted first, with a raw body parser, so it bypasses the
// CORS + api-key gates below (GitHub sends neither) and can verify its own HMAC
const { githubDeployHandler } = require("./deployWebhook");
app.post("/deploy/github", express.raw({ type: "*/*" }), githubDeployHandler);

// public liveness probe (also bypasses the api-key gate so monitors can hit it)
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

const isDevelopment = process.env.NODE_ENV === "development";

// allowed origins are configurable via ALLOWED_ORIGINS (comma-separated); falls
// back to the production domain so behaviour is unchanged when it isn't set
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://crixus.com.ar")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => isDevelopment || !origin || allowedOrigins.includes(origin);

const corsOrigin = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
};

const io = socketIO(server, {
  maxHttpBufferSize: 1e5, // 100 KB cap on WebSocket messages against memory DoS
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  },
});

const coinFlip = require("./games/coinFlip");
const crash = require("./games/crash");
const roadMultiplayer = require("./games/roadMultiplayer");
const { setEconomyIo } = require("./utils/economy");
const { getRecentWins } = require("./utils/liveFeed");
setEconomyIo(io);
const userRoutes = require("./routes/userRoutes");
const caseRoutes = require("./routes/caseRoutes");
const itemRoutes = require("./routes/itemRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes")(io);
const adminRoutes = require("./routes/adminRoutes");
const gamesRoutes = require("./routes/gamesRoutes")(io);
const friendsRoutes = require("./routes/friendsRoutes")(io);
const rewardsRoutes = require("./routes/rewardsRoutes")(io);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
  })
  .then(async () => {
    console.log("MongoDB connected");
    // apply pending data migrations (backend/migrations); never fatal
    try {
      await runMigrations();
    } catch (err) {
      console.error("[migrations] runner error:", err);
    }
  })
  .catch((err) => console.log(err));

// Middleware
// behind Nginx on the same host: trust X-Forwarded-For only from loopback
app.set("trust proxy", "loopback");
app.use(express.json({ limit: "2mb" }));
app.use(sanitizePayload);
app.use(cors(corsOptions));

// Browser page navigations / F5 refreshes on SPA routes that share a prefix
// with API routes (e.g. /rewards, /rewards/, /marketplace, /marketplace/item/:id):
// when Nginx proxies them to Express without an x-api-key header, serve the
// public SPA index.html shell so React Router handles the page instead of
// returning 403 {"error":"Forbidden"}. API requests always go to checkApiKey.
const spaIndexPath = process.env.SPA_INDEX_PATH || path.resolve(__dirname, "../dist/index.html");
app.use((req, res, next) => {
  const accept = req.headers.accept || "";
  if (
    req.method === "GET" &&
    !req.headers["x-api-key"] &&
    accept.includes("text/html") &&
    fs.existsSync(spaIndexPath)
  ) {
    return res.sendFile(spaIndexPath);
  }
  return next();
});

// block requests from outside
app.use(checkApiKey);

const { apiLimiter } = require("./middleware/rateLimits");
app.use(apiLimiter);


// Routes
// app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/cases", caseRoutes);
app.use("/items", itemRoutes);
app.use("/marketplace", marketplaceRoutes);
app.use("/admin", adminRoutes);
app.use("/games", gamesRoutes);
app.use("/friends", friendsRoutes);
app.use("/rewards", rewardsRoutes);

// Start the games
coinFlip(io);
crash(io);
roadMultiplayer(io);

// Start the cron jobs
cronJobs.startCronJobs(io);

const port = process.env.PORT || 5000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

let onlineUsers = 0;
const socketsPerIp = new Map();
const MAX_SOCKETS_PER_IP = 15;

// optional auth: a valid HttpOnly cookie (or fallback handshake auth token) with
// matching tokenVersion binds socket.userId; anonymous sockets may still watch
// games but the game handlers ignore any client-supplied identity.
io.use(async (socket, next) => {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
    socket.handshake.address ||
    "unknown";
  const activeForIp = socketsPerIp.get(ip) || 0;
  if (activeForIp >= MAX_SOCKETS_PER_IP) {
    return next(new Error("Too many connections"));
  }
  socket.clientIp = ip;

  try {
    const token = extractSocketToken(socket);
    if (typeof token === "string" && token.length > 0) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
      const user = await User.findById(decoded.userId).select("tokenVersion").lean();
      if (user) {
        const userTv = typeof user.tokenVersion === "number" ? user.tokenVersion : 0;
        const tokenTv = typeof decoded.tv === "number" ? decoded.tv : 0;
        if (tokenTv === userTv) {
          socket.userId = decoded.userId;
        }
      }
    }
  } catch (err) {
    // invalid/expired/revoked token: continue unauthenticated
  }
  socket.isRateLimited = createSocketRateLimiter({ maxEvents: 20, windowMs: 5000 });
  next();
});

io.on("connection", (socket) => {
  const ip = socket.clientIp || "unknown";
  socketsPerIp.set(ip, (socketsPerIp.get(ip) || 0) + 1);
  onlineUsers++;
  io.emit("onlineUsers", onlineUsers);
  socket.emit("liveFeed:history", getRecentWins(20));

  // join the authenticated user's private room for targeted updates
  if (socket.userId) {
    socket.join(socket.userId.toString());
  }

  socket.on("disconnect", () => {
    const nextCount = (socketsPerIp.get(ip) || 1) - 1;
    if (nextCount <= 0) socketsPerIp.delete(ip);
    else socketsPerIp.set(ip, nextCount);
    onlineUsers = Math.max(0, onlineUsers - 1);
    io.emit("onlineUsers", onlineUsers);
  });
});
