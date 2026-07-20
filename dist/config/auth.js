import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
// Internal singleton — set once after DB connects via initAuth()
let _auth = null;
/**
 * Call this once in index.ts AFTER connectDB() has resolved.
 * All subsequent calls to getAuth() will return the initialised instance.
 */
export function initAuth() {
    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const serverUrl = process.env.BETTER_AUTH_URL || "http://localhost:5001";
    _auth = betterAuth({
        database: mongodbAdapter(mongoose.connection.db, {
            client: mongoose.connection.getClient(),
            usePlural: true,
        }),
        emailAndPassword: {
            enabled: true,
            autoSignIn: false, // Don't auto-login after registration; user must log in explicitly
        },
        socialProviders: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID || "google_client_id_placeholder",
                clientSecret: process.env.GOOGLE_CLIENT_SECRET || "google_client_secret_placeholder",
            },
        },
        secret: process.env.BETTER_AUTH_SECRET || "super_secret_session_key_123_abc_default_secret",
        trustedOrigins: [frontendUrl, serverUrl, "http://localhost:3000", "http://localhost:5001"],
        baseURL: serverUrl,
        advanced: {
            useSecureCookies: isProduction,
            defaultCookieAttributes: isProduction
                ? {
                    sameSite: "none",
                    secure: true,
                    partitioned: true,
                }
                : undefined,
        },
        // .vercel.app subdomains are on the Public Suffix List — browsers treat
        // nest-find-gules.vercel.app and nest-find-server-tawny.vercel.app as
        // separate registrable domains, so the OAuth state cookie set by the
        // server cannot be read back even with sameSite=none.
        // skipStateCookieCheck is the accepted workaround for cross-domain Vercel deploys.
        account: {
            accountLinking: {
                enabled: true,
            },
            skipStateCookieCheck: true,
        },
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
export const auth = new Proxy({}, {
    get(_target, prop) {
        return getAuth()[prop];
    },
});
export function getFetchHeaders(nodeHeaders) {
    const headers = new Headers();
    Object.entries(nodeHeaders).forEach(([key, value]) => {
        if (value) {
            headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
        }
    });
    return headers;
}
