import dotenv from "dotenv";

// Load .env from the Backend directory (on Vercel and Render the values come from their settings)
dotenv.config({
  path: new URL("./.env", import.meta.url)
});

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import attachmentRoutes from "./routes/attachments.js";
import runRoutes from "./routes/run.js";
import scorecardRoutes from "./routes/scorecards.js";
import resumeRoutes from "./routes/resume.js";
import requireAuth from "./middleware/auth.js";

// Login tokens cannot be signed safely without a strong secret
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    "JWT_SECRET is missing or too short (use at least 32 characters). Add it to the environment variables."
  );
  process.exit(1);
}

const app = express();

// Needed for correct rate limiting when deployed behind a proxy (Render, Vercel, etc.)
app.set("trust proxy", 1);

// Safer default headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Only allow your own frontend to call this API
// Add more origins in the settings, separated by commas: CLIENT_ORIGIN=http://localhost:5173,https://your-site.com
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins
  })
);

app.use(express.json({ limit: "1mb" }));


// ===== Database connection =====
// The connection is reused between requests. If it was lost (for example
// after the function slept on Vercel), a new one is opened.

let dbConnectionPromise = null;

const connectDB = async () => {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const state = mongoose.connection.readyState;

  if (state === 1) {
    return;
  }

  // Another request is already connecting: wait for it
  if (state === 2 && dbConnectionPromise) {
    return dbConnectionPromise;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from the environment variables");
  }

  dbConnectionPromise = mongoose
    .connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 5
    })
    .then(() => {
      console.log("Connected with Database");
    })
    .catch((err) => {
      dbConnectionPromise = null;
      throw err;
    });

  return dbConnectionPromise;
};


// Health check (useful when you deploy)
app.get("/health", async (req, res) => {
  try {
    await connectDB();

    return res.status(200).json({
      status: "ok",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
  } catch (err) {
    console.error("Health check database error:", err.message);

    return res.status(503).json({
      status: "error",
      database: "disconnected"
    });
  }
});

// Make sure the database is ready before any other request is handled
app.use(async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (err) {
    console.error("Database connection failed:", err.message);

    return res.status(503).json({
      error: "The database is not reachable right now. Please try again in a moment."
    });
  }
});


// Slow down password guessing: only failed logins count
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please wait 15 minutes and try again."
  }
});

// Limit how many accounts one network can create
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many accounts created from this network. Please try again later."
  }
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", registerLimiter);
app.use("/api/auth", authRoutes);

// Everything below this line needs a logged-in user
app.use("/api", requireAuth);

// Limit how often one user can call the chat endpoints
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait a minute and try again."
  }
});

// Limit how many files one user can upload (viewing images is not limited)
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  keyGenerator: (req) => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many uploads. Please wait a few minutes and try again."
  }
});

// Limit how often one user can run code
const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You are running code too quickly. Please wait a minute and try again."
  }
});

// Limit how often one user can create scorecards (each one is an AI request)
const scorecardLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 6,
  keyGenerator: (req) => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You are creating scorecards too quickly. Please wait a few minutes and try again."
  }
});

// Limit resume uploads and AI reviews (each review is an AI request)
const resumeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  keyGenerator: (req) => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You are doing this too quickly. Please wait a few minutes and try again."
  }
});

app.use("/api/chat", chatLimiter);
app.post("/api/attachments", uploadLimiter);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/run", runLimiter);
app.use("/api/run", runRoutes);
app.post("/api/scorecards", scorecardLimiter);
app.use("/api/scorecards", scorecardRoutes);
app.post(["/api/resume/upload", "/api/resume/review"], resumeLimiter);
app.use("/api/resume", resumeRoutes);
app.use("/api", chatRoutes);

// Unknown routes (keep this below every route above)
app.use((req, res) => {
  return res.status(404).json({
    error: "Route not found"
  });
});

// Catch any remaining errors and always reply with JSON
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Invalid JSON in request body"
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: "Request is too large"
    });
  }

  console.error("Unhandled server error:", err);

  return res.status(500).json({
    error: "Something went wrong on the server"
  });
});

// Debug: never print your actual credentials
console.log(
  "MongoDB URI loaded:",
  Boolean(process.env.MONGODB_URI)
);

console.log(
  "OpenRouter API key loaded:",
  Boolean(process.env.OPENROUTER_API_KEY)
);

const PORT = process.env.PORT || 8080;

// On your computer and on Render the server starts here.
// On Vercel the platform runs the exported app instead.
if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Not Connected with Database:", err.message);
      process.exit(1);
    });
}

export default app;