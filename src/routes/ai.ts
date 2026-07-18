import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Listing } from "../models/Listing.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables. NestFind will use local fallback algorithms for AI recommendations and chat.");
}

const genAI = new GoogleGenerativeAI(apiKey || "dummy_key");

// Helper function: Local matching fallback for recommendations
function getFallbackRecommendations(listings: any[], budget: number, preferredArea: string, lifestyle: string) {
  const scored = listings.map((l) => {
    let score = 0;
    
    // Match location
    if (preferredArea && l.location.toLowerCase().includes(preferredArea.toLowerCase())) {
      score += 50;
    }
    
    // Budget constraint check
    if (l.price <= budget) {
      score += 30;
      // Close to budget max is better (more premium match)
      score += (l.price / budget) * 10;
    } else {
      // Over budget penalty
      score -= (l.price - budget) * 0.1;
    }

    return { listing: l, score };
  });

  scored.sort((a, b) => b.score - a.score);
  
  // Return top 3 matched listings formatted
  return scored.slice(0, 3).map((item) => ({
    listingId: item.listing._id.toString(),
    matchReason: `This room matches your ${preferredArea || "preferred"} area preference and fits perfectly within your $${budget} budget. It features a great layout suitable for a ${lifestyle || "active"} lifestyle, including utilities like ${item.listing.amenities.slice(0, 3).join(", ") || "high-speed Wifi"}.`,
  }));
}

// Helper function: Local keyword fallback for chatbot
function getFallbackChatResponse(messages: any[], listingsSummary: any[]) {
  const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
  
  let message = "";
  let filters: any = null;

  if (lastUserMsg.includes("how do i list") || lastUserMsg.includes("how to list") || lastUserMsg.includes("list a room")) {
    message = "To list a room on NestFind, please sign in and click the 'Add Listing' button in the navigation bar. Fill in the form details (location, price, dates, amenities, and image link) and click publish. It will immediately show up in our Explore directory!";
  } else if (lastUserMsg.includes("brooklyn") || lastUserMsg.includes("williamsburg")) {
    message = "I searched our rooms and found some co-living listings in Brooklyn. Take a look below!";
    filters = { location: "Brooklyn", maxPrice: null, amenities: null };
  } else if (lastUserMsg.includes("seattle") || lastUserMsg.includes("capitol hill")) {
    message = "Here are our co-living suites located in Seattle, WA. You can check their details below.";
    filters = { location: "Seattle", maxPrice: null, amenities: null };
  } else if (lastUserMsg.includes("chicago") || lastUserMsg.includes("loop") || lastUserMsg.includes("wicker park")) {
    message = "Here are our available rooms in Chicago, IL. Check out their details below.";
    filters = { location: "Chicago", maxPrice: null, amenities: null };
  } else if (lastUserMsg.includes("san francisco") || lastUserMsg.includes("mission district")) {
    message = "Here are co-living lofts located in San Francisco, CA. Let me know if you need specific details!";
    filters = { location: "San Francisco", maxPrice: null, amenities: null };
  } else if (lastUserMsg.includes("los angeles") || lastUserMsg.includes("santa monica") || lastUserMsg.includes("la")) {
    message = "Here are listings near Los Angeles, CA. Check their specs below!";
    filters = { location: "Los Angeles", maxPrice: null, amenities: null };
  } else if (lastUserMsg.includes("cheap") || lastUserMsg.includes("cheapest") || lastUserMsg.includes("under 1000") || lastUserMsg.includes("under $1000") || lastUserMsg.includes("low budget")) {
    message = "I've filtered our listings to show you rooms under $1,000. Take a look at these affordable co-living options:";
    filters = { location: null, maxPrice: 1000, amenities: null };
  } else if (lastUserMsg.includes("wifi") || lastUserMsg.includes("internet")) {
    message = "I found listings that offer high-speed internet/Wifi as part of their amenities.";
    filters = { location: null, maxPrice: null, amenities: ["Wifi"] };
  } else if (lastUserMsg.includes("laundry") || lastUserMsg.includes("washer")) {
    message = "These co-living homes feature in-unit laundry or shared washing facilities:";
    filters = { location: null, maxPrice: null, amenities: ["Laundry"] };
  } else {
    message = "I am NestFind's co-living AI assistant. You can ask me how to list rooms, find the cheapest spaces, or search by locations like Brooklyn, San Francisco, Chicago, or Seattle!";
  }

  return { message, filters };
}

// AI Recommendation Route
router.post("/recommend", async (req, res) => {
  try {
    const { budget, preferredArea, lifestyle, commutePriority } = req.body;

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
- Lifestyle: "${lifestyle}"
- Commute Priority: "${commutePriority}"

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

    let recommendations = [];
    if (apiKey) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        recommendations = JSON.parse(cleanJson);
      } catch (geminiError) {
        console.error("Gemini API call failed, using local recommendation algorithm:", geminiError);
        recommendations = getFallbackRecommendations(listings, Number(budget), preferredArea, lifestyle);
      }
    } else {
      recommendations = getFallbackRecommendations(listings, Number(budget), preferredArea, lifestyle);
    }

    // Merge recommendations with full listing data
    const populatedRecommendations = recommendations
      .map((rec: any) => {
        const listing = listings.find((l) => l._id.toString() === rec.listingId);
        if (!listing) return null;
        return {
          listing,
          matchReason: rec.matchReason,
        };
      })
      .filter(Boolean);

    res.json(populatedRecommendations);
  } catch (error: any) {
    console.error("AI recommendation error:", error);
    res.status(500).json({ message: error.message || "Recommendation engine failed" });
  }
});

// AI Chat Route (Context-Aware Chat Widget)
router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

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
      .slice(-6)
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

    let aiResponse;
    if (apiKey) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        aiResponse = JSON.parse(cleanJson);
      } catch (geminiError) {
        console.error("Gemini Chat failed, using rule-based fallback parser:", geminiError);
        aiResponse = getFallbackChatResponse(messages, listingsSummary);
      }
    } else {
      aiResponse = getFallbackChatResponse(messages, listingsSummary);
    }

    // If filters are extracted, query MongoDB for matching listings
    let matchedListings: any[] = [];
    if (aiResponse.filters) {
      const dbFilter: any = {};
      const { location, maxPrice, amenities } = aiResponse.filters;

      if (location) {
        dbFilter.location = { $regex: location, $options: "i" };
      }
      if (maxPrice) {
        dbFilter.price = { $lte: Number(maxPrice) };
      }
      if (amenities && Array.isArray(amenities) && amenities.length > 0) {
        // Map back to standard names (e.g. wifi -> High-speed Wifi)
        const mappedAmenities = amenities.map((a: string) => {
          if (a.toLowerCase() === "wifi") return "High-speed Wifi";
          if (a.toLowerCase() === "laundry") return "In-unit Laundry";
          if (a.toLowerCase() === "kitchen") return "Chef's Kitchen";
          if (a.toLowerCase() === "garden") return "Shared Garden";
          return a;
        });
        dbFilter.amenities = { $all: mappedAmenities };
      }

      matchedListings = await Listing.find(dbFilter).limit(3);
    }

    res.json({
      message: aiResponse.message,
      listings: matchedListings,
    });
  } catch (error: any) {
    console.error("AI chat error:", error);
    res.status(500).json({ message: error.message || "AI Chat failed" });
  }
});

export default router;
