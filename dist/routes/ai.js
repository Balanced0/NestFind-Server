import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Listing } from "../models/Listing.js";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables.");
}
const genAI = new GoogleGenerativeAI(apiKey || "");
// AI Recommendation Route
router.post("/recommend", async (req, res) => {
    try {
        const { budget, preferredArea, lifestyle, commutePriority, savedListings } = req.body;
        if (!budget || !preferredArea || !lifestyle || !commutePriority) {
            return res.status(400).json({ message: "Onboarding preferences are required." });
        }
        // Fetch all listings
        const listings = await Listing.find({});
        if (listings.length === 0) {
            return res.json([]);
        }
        // Create a compact representation of listings for the model to save tokens
        const listingsSummary = listings.map((l) => ({
            id: l._id.toString(),
            title: l.title,
            price: l.price,
            location: l.location,
            amenities: l.amenities,
            shortDescription: l.shortDescription,
        }));
        const prompt = `
You are NestFind's Smart Recommendation Engine.
A user has completed their co-living onboarding profile:
- Monthly Budget: up to $${budget}
- Preferred Area: "${preferredArea}"
- Lifestyle: "${lifestyle}" (e.g. quiet, social, clean, night owl)
- Commute Priority: "${commutePriority}" (e.g. transit near, close to downtown)

Here are the available co-living listings in our database:
${JSON.stringify(listingsSummary, null, 2)}

Please analyze these listings and rank the top 3 matches for this user.
For each match, write a warm, friendly, editorial 2-3 sentence explanation of "why this fits" their lifestyle, budget, and area preferences.

Return ONLY a JSON array in the following format (no markdown formatting, no backticks, no wrap):
[
  {
    "listingId": "listing_id_string",
    "matchReason": "Explanation of why this fits..."
  }
]
`;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        // Clean markdown backticks if present
        const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        let recommendations = [];
        try {
            recommendations = JSON.parse(cleanJson);
        }
        catch (parseError) {
            console.error("Failed to parse Gemini recommendation JSON:", text);
            // Fallback: rank top listings manually
            recommendations = listings.slice(0, 3).map(l => ({
                listingId: l._id.toString(),
                matchReason: `A solid option in ${l.location} that fits within a budget of $${budget}. Includes ${l.amenities.slice(0, 3).join(", ")}.`
            }));
        }
        // Merge recommendations with full listing data
        const populatedRecommendations = recommendations
            .map((rec) => {
            const listing = listings.find((l) => l._id.toString() === rec.listingId);
            if (!listing)
                return null;
            return {
                listing,
                matchReason: rec.matchReason,
            };
        })
            .filter(Boolean);
        res.json(populatedRecommendations);
    }
    catch (error) {
        console.error("AI recommendation error:", error);
        res.status(500).json({ message: error.message || "Recommendation engine failed" });
    }
});
// AI Chat Route (Context-Aware Chat Widget)
router.post("/chat", async (req, res) => {
    try {
        const { messages } = req.body; // Array of { role: 'user' | 'assistant', content: string }
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: "Messages array is required." });
        }
        // Fetch all listings to give the AI context about the properties
        const listings = await Listing.find({});
        const listingsSummary = listings.map((l) => ({
            id: l._id.toString(),
            title: l.title,
            price: l.price,
            location: l.location,
            amenities: l.amenities,
            shortDescription: l.shortDescription,
        }));
        const conversationHistoryText = messages
            .slice(-6) // Keep last 6 messages to stay within limits and maintain context
            .map((m) => `${m.role === "user" ? "User" : "NestFind AI"}: ${m.content}`)
            .join("\n");
        const systemPrompt = `
You are NestFind AI, a helpful and warm co-living matching assistant.
Your goal is to guide users to list rooms, find co-living spaces, and answer questions.

How to list a room on NestFind:
Users can list a room by clicking on "Add Listing" in the navbar, filling out the form, and submitting it. They must be logged in.

Here are the current active rooms in our database:
${JSON.stringify(listingsSummary, null, 2)}

Given the following conversation history and the user's latest query, respond in JSON format.
Your output MUST be a JSON object containing two fields:
1. "message": Your text response to the user. Keep it brief, conversational, and direct. If you find matching listings, say something like: "I found a few spaces that match your request! You can see them below."
2. "filters": An object defining search constraints if they are searching for rooms. Set fields to null if not applicable.
   - "location": A string of a city/neighborhood if they mentioned one (e.g. "Seattle" or "Brooklyn" or "Chicago") or null.
   - "maxPrice": A number representing their maximum price limit or null.
   - "amenities": An array of lowercase amenity strings (like "wifi", "laundry", "garden") or null.

JSON format structure:
{
  "message": "Text response here...",
  "filters": {
    "location": "location_name" or null,
    "maxPrice": price_number or null,
    "amenities": ["amenity1", "amenity2"] or null
  }
}

Do not include any extra text outside the JSON. Return only the JSON object.
`;
        const prompt = `${systemPrompt}\n\nRecent History:\n${conversationHistoryText}\n\nOutput JSON:`;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        let aiResponse;
        try {
            aiResponse = JSON.parse(cleanJson);
        }
        catch (parseError) {
            console.error("Failed to parse Gemini chat JSON response:", text);
            aiResponse = {
                message: "I'm having a little trouble parsing the rooms search. Ask me about our co-living spaces, or type a location and budget to find matches!",
                filters: null,
            };
        }
        // If filters are extracted, query MongoDB for matching listings
        let matchedListings = [];
        if (aiResponse.filters) {
            const dbFilter = {};
            const { location, maxPrice, amenities } = aiResponse.filters;
            if (location) {
                dbFilter.location = { $regex: location, $options: "i" };
            }
            if (maxPrice) {
                dbFilter.price = { $lte: Number(maxPrice) };
            }
            if (amenities && Array.isArray(amenities) && amenities.length > 0) {
                dbFilter.amenities = { $all: amenities.map((a) => new RegExp(`^${a}$`, "i")) };
            }
            matchedListings = await Listing.find(dbFilter).limit(3);
        }
        res.json({
            message: aiResponse.message,
            listings: matchedListings,
        });
    }
    catch (error) {
        console.error("AI chat error:", error);
        res.status(500).json({ message: error.message || "AI Chat failed" });
    }
});
export default router;
