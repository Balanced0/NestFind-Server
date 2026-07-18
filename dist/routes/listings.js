import express from "express";
import { Listing } from "../models/Listing.js";
import { User } from "../models/User.js";
import { Review } from "../models/Review.js";
import { auth, getFetchHeaders } from "../config/auth.js";
const router = express.Router();
// Middleware helper to check session
async function getSessionUser(req) {
    try {
        const session = await auth.api.getSession({
            headers: getFetchHeaders(req.headers),
        });
        return session?.user || null;
    }
    catch (error) {
        console.error("Get session error:", error);
        return null;
    }
}
// GET /api/listings - Get all listings (with search, filter, sort, pagination)
router.get("/", async (req, res) => {
    try {
        const { search, location, minPrice, maxPrice, amenities, moveInDate, sort, page, limit } = req.query;
        const filter = {};
        // Text search
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { shortDescription: { $regex: search, $options: "i" } },
                { fullDescription: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } },
            ];
        }
        // Location filter
        if (location && location !== "All") {
            filter.location = { $regex: location, $options: "i" };
        }
        // Price filter
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice)
                filter.price.$gte = Number(minPrice);
            if (maxPrice)
                filter.price.$lte = Number(maxPrice);
        }
        // Move-in date filter (available on or after the specified date)
        if (moveInDate) {
            filter.moveInDate = { $gte: new Date(moveInDate) };
        }
        // Amenities filter (must match all selected amenities)
        if (amenities) {
            const amenitiesList = Array.isArray(amenities)
                ? amenities
                : amenities.split(",").map(a => a.trim()).filter(Boolean);
            if (amenitiesList.length > 0) {
                filter.amenities = { $all: amenitiesList };
            }
        }
        // Sorting
        let sortOption = { createdAt: -1 };
        if (sort === "price_asc")
            sortOption = { price: 1 };
        if (sort === "price_desc")
            sortOption = { price: -1 };
        if (sort === "newest")
            sortOption = { createdAt: -1 };
        if (sort === "oldest")
            sortOption = { createdAt: 1 };
        // Pagination
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 12;
        const skip = (pageNum - 1) * limitNum;
        const total = await Listing.countDocuments(filter);
        const listings = await Listing.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum);
        res.json({
            listings,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch listings" });
    }
});
// GET /api/listings/user/manage - Get current user's listings (Protected)
router.get("/user/manage", async (req, res) => {
    try {
        const user = await getSessionUser(req);
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const listings = await Listing.find({ ownerId: user.id }).sort({ createdAt: -1 });
        res.json(listings);
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch user listings" });
    }
});
// GET /api/listings/:id - Get listing detail with owner info and reviews
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }
        // Fetch owner details
        const owner = await User.findById(listing.ownerId).select("name email image");
        // Fetch reviews and populate reviewer details
        const reviews = await Review.find({ listingId: listing._id }).sort({ createdAt: -1 });
        const populatedReviews = [];
        for (const review of reviews) {
            const reviewer = await User.findById(review.userId).select("name image");
            populatedReviews.push({
                _id: review._id,
                listingId: review.listingId,
                userId: review.userId,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt,
                user: reviewer || { name: "NestFind Roommate" },
            });
        }
        // Fetch related listings (same city or state, excluding current listing)
        const locationParts = listing.location.split(",");
        const city = locationParts[0]?.trim();
        const related = await Listing.find({
            _id: { $ne: listing._id },
            location: { $regex: city, $options: "i" }
        }).limit(4);
        res.json({
            listing,
            owner: owner || { name: "System Host", email: "support@nestfind.com" },
            reviews: populatedReviews,
            related,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch listing detail" });
    }
});
// POST /api/listings - Add a new listing (Protected)
router.post("/", async (req, res) => {
    try {
        const user = await getSessionUser(req);
        if (!user) {
            return res.status(401).json({ message: "Unauthorized. Please log in first." });
        }
        const { title, shortDescription, fullDescription, price, location, moveInDate, amenities, images } = req.body;
        if (!title || !shortDescription || !fullDescription || !price || !location || !moveInDate) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const imageArray = Array.isArray(images) && images.length > 0
            ? images
            : ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop"];
        const listing = new Listing({
            title,
            shortDescription,
            fullDescription,
            price: Number(price),
            location,
            moveInDate: new Date(moveInDate),
            amenities: Array.isArray(amenities) ? amenities : [],
            images: imageArray,
            ownerId: user.id,
        });
        await listing.save();
        res.status(201).json(listing);
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to create listing" });
    }
});
// DELETE /api/listings/:id - Delete a listing (Protected)
router.delete("/:id", async (req, res) => {
    try {
        const user = await getSessionUser(req);
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }
        // Check if the user is the owner
        if (listing.ownerId !== user.id) {
            return res.status(403).json({ message: "Forbidden: You do not own this listing" });
        }
        await Listing.findByIdAndDelete(id);
        // Also delete any reviews associated with this listing
        await Review.deleteMany({ listingId: id });
        res.json({ message: "Listing deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to delete listing" });
    }
});
export default router;
