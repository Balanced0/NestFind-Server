# NestFind Backend 🏠✨

The AI-powered co-living matchmaking server. This backend handles user authentication via Better Auth, MongoDB database interaction using Mongoose, and advanced roommate/listing recommendations using Google's Gemini API.

---

## 🛠️ Tech Stack
* **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
* **Framework**: [Express.js](https://expressjs.com/) with TypeScript
* **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose ODM](https://mongoosejs.com/)
* **Authentication**: [Better Auth](https://better-auth.com/) (cross-domain, session & social login)
* **AI Capabilities**: [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (Gemini 3.5 Flash)
* **Deployment**: Optimized for serverless deployment on [Vercel](https://vercel.com/)

---

## 🚀 Environment Variables
Create a `.env` file in the root of the server directory:

```env
# Server Configuration
PORT=5001

# MongoDB Connection String
MONGODB_URI=mongodb+srv://...

# Better Auth Secret (Generate via `openssl rand -base64 32`)
BETTER_AUTH_SECRET=your_32_character_secret_key

# Better Auth URL (Must point to the FRONTEND proxy endpoint in production)
# Local: http://localhost:3000
# Production: https://nest-find-gules.vercel.app
BETTER_AUTH_URL=https://nest-find-gules.vercel.app

# Frontend URL (For CORS whitelist)
# Local: http://localhost:3000
# Production: https://nest-find-gules.vercel.app
FRONTEND_URL=https://nest-find-gules.vercel.app

# Google OAuth Credentials (OAuth SSO)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Gemini Generative AI Key
GEMINI_API_KEY=your_gemini_api_key
```

---

## 📦 Setup & Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in development**:
   ```bash
   npm run dev
   ```

3. **Build the TypeScript files**:
   ```bash
   npm run build
   ```

4. **Seed database with sample rooms**:
   ```bash
   npm run seed
   ```

---

## 📡 API Endpoints

### Authentication
* `ALL /api/auth/*` -> Mounted Better Auth handler (SSO, register, login, signout)

### Listings
* `GET /api/listings` -> Fetch rooms (with filters & sorting)
* `GET /api/listings/:id` -> Fetch single room details
* `POST /api/listings` -> Add new listing (authenticated)
* `DELETE /api/listings/:id` -> Delete a listing (authenticated)
* `GET /api/listings/user/manage` -> Manage user's own listings

### AI & Recommendations
* `POST /api/ai/recommend` -> AI-backed roommate matching based on lifestyle & budget
* `POST /api/ai/chat` -> Context-aware chat widget assistant with listing suggestions

---

## ☁️ Vercel Deployment Instructions

1. Install the Vercel CLI or import the repository in your Vercel Dashboard.
2. Link the repository as a **Node.js** project.
3. Configure the **Environment Variables** matching your production `.env` settings.
4. Set the **Build Command** to `npm run build` and **Output Directory** to `dist`.
5. Deploy! Vercel will automatically read `vercel.json` and host your Express app as a serverless function.
