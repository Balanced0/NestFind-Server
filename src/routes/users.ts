import express from "express";
import { User } from "../models/User.js";
import { Listing } from "../models/Listing.js";
import { Review } from "../models/Review.js";
import { auth, getFetchHeaders } from "../config/auth.js";

const router = express.Router();

// Middleware helper to check session
async function getSessionUser(req: express.Request) {
  try {
    const session = await auth.api.getSession({
      headers: getFetchHeaders(req.headers),
    });
    return session?.user || null;
  } catch (error) {
    console.error("Get session error:", error);
    return null;
  }
}

// GET /api/users/me — return the current user's profile with stats
router.get("/me", async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(sessionUser.id).select("name email image createdAt");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch activity stats
    const listingsCount = await Listing.countDocuments({ ownerId: sessionUser.id });
    const reviewsCount = await Review.countDocuments({ userId: sessionUser.id });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      listingsCount,
      reviewsCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch profile" });
  }
});

// PATCH /api/users/me — update name and/or avatar image
router.patch("/me", async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, image } = req.body;

    // Build update payload — only include provided fields
    const updates: Record<string, string> = {};
    if (name && typeof name === "string" && name.trim()) updates.name = name.trim();
    if (typeof image === "string") updates.image = image.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided to update" });
    }

    // Update via Better Auth so the session reflects the change
    await auth.api.updateUser({
      headers: getFetchHeaders(req.headers),
      body: updates,
    });

    // Also update our Mongoose model so DB stays in sync
    const updatedUser = await User.findByIdAndUpdate(
      sessionUser.id,
      { $set: updates },
      { new: true }
    ).select("name email image createdAt");

    res.json(updatedUser);
  } catch (error: any) {
    console.error("Update user error:", error);
    res.status(500).json({ message: error.message || "Failed to update profile" });
  }
});

export default router;
