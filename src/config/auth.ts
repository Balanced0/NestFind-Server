import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Internal singleton — set once after DB connects via initAuth()
let _auth: any = null;

/**
 * Call this once in index.ts AFTER connectDB() has resolved.
 * All subsequent calls to getAuth() will return the initialised instance.
 */
export function initAuth() {
  _auth = betterAuth({
    database: mongodbAdapter(mongoose.connection.db as any, {
      client: mongoose.connection.getClient() as any,
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "google_client_id_placeholder",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "google_client_secret_placeholder",
      },
    },
    secret: process.env.BETTER_AUTH_SECRET || "super_secret_session_key_123_abc_default_secret",
    trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:3000"],
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5001",
  });
  return _auth;
}

/**
 * Returns the auth instance. Throws if initAuth() was not called first.
 */
export function getAuth() {
  if (!_auth) {
    throw new Error("Auth has not been initialised. Call initAuth() after connectDB().");
  }
  return _auth;
}

// Backwards-compatible named export used by routes (lazy proxy)
export const auth = new Proxy({} as any, {
  get(_target, prop) {
    return (getAuth() as any)[prop];
  },
});

export function getFetchHeaders(nodeHeaders: any): Headers {
  const headers = new Headers();
  Object.entries(nodeHeaders).forEach(([key, value]) => {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
    }
  });
  return headers;
}
