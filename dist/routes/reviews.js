import express from "express";
import { Review } from "../models/Review.js";
import { auth, getFetchHeaders } from "../config/auth.js";
const router = express.Router();
async function getSessionUser(req) {
    try {
        const session = await auth.api.getSession({
            headers: getFetchHeaders(req.headers),
        });
        return session?.user || null;
    }
    catch (error) {
        return null;
    }
}
// POST /api/reviews - Add a review to a listing (Protected)
router.post("/", async (req, res) => {
    try {
        const user = await getSessionUser(req);
        if (!user) {
            return res.status(401).json({ message: "Unauthorized. Please log in first." });
        }
        const { listingId, rating, comment } = req.body;
        if (!listingId || !rating || !comment) {
            return res.status(400).json({ message: "All fields (listingId, rating, comment) are required." });
        }
        const review = new Review({
            listingId,
            userId: user.id,
            rating: Number(rating),
            comment,
        });
        await review.save();
        res.status(201).json(review);
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to submit review" });
    }
});
export default router;
