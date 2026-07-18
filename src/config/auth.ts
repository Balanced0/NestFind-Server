import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const auth = betterAuth({
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

export function getFetchHeaders(nodeHeaders: any): Headers {
  const headers = new Headers();
  Object.entries(nodeHeaders).forEach(([key, value]) => {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
    }
  });
  return headers;
}

