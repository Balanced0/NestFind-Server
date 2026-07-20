import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { initAuth, getAuth } from "./config/auth.js";
import { toNodeHandler } from "better-auth/node";
import listingsRouter from "./routes/listings.js";
import reviewsRouter from "./routes/reviews.js";
import aiRouter from "./routes/ai.js";
import usersRouter from "./routes/users.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;
// 1. Connect to Database FIRST before anything else
await connectDB();
// 2. Now that Mongoose is connected, safely initialise Better Auth
initAuth();
// CORS configuration - MUST be before any router, and support credentials for auth cookies
const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like Postman/curl) or from allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
}));
// Mount Better Auth handler BEFORE express.json() to prevent body-parsing issues
app.all("/api/auth/*", toNodeHandler(getAuth()));
// Body parsing middleware (only for subsequent routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Log requests
app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.path}`);
    next();
});
// API Routes
app.use("/api/listings", listingsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/users", usersRouter);
// Health check route
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "NestFind server is running smoothly." });
});
// Start server only if not running on Vercel
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`[Server] NestFind backend listening on port ${PORT}`);
    });
}
export default app;
