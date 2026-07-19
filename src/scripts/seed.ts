import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { initAuth } from "../config/auth.js";
import { Listing } from "../models/Listing.js";
import { Review } from "../models/Review.js";

dotenv.config();

const listingsTemplate = [
  {
    title: "Sleek Terracotta Loft in Mission District",
    shortDescription: "A sun-drenched industrial loft space in the heart of Mission, matching modern design with warm brick walls.",
    fullDescription: "Nestled in the vibrant Mission District, this co-living loft features high ceilings, exposed brick walls, and custom terracotta tiles. The room is fully furnished with a queen-sized bed, writing desk, and private shelving. You will share a spacious chef's kitchen, dining table, and cozy living space with three friendly, design-minded roommates. Perfect for creatives and remote workers.",
    price: 1200,
    location: "San Francisco, CA",
    moveInDate: new Date("2026-08-01"),
    amenities: ["High-speed Wifi", "In-unit Laundry", "Chef's Kitchen", "Rooftop Access", "Weekly Cleaning"],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800&auto=format&fit=crop"
    ],
  },
  {
    title: "Bohemian Co-Living Suite in Brooklyn",
    shortDescription: "Charming light-filled room in a historic Williamsburg brownstone with access to a beautiful green garden.",
    fullDescription: "Welcome to our green sanctuary in Williamsburg! This co-living room is styled with editorial-inspired mid-century furniture, warm lighting, and plenty of plants. The house features a shared backyard garden (perfect for morning coffee), a massive dining room, and custom plaster finishes. Excellent location only two blocks from the L train.",
    price: 1050,
    location: "Brooklyn, NY",
    moveInDate: new Date("2026-08-15"),
    amenities: ["High-speed Wifi", "Shared Garden", "Mid-century Furnishings", "Kitchen Access", "Storage Area"],
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop"
    ],
  },
  {
    title: "Modern Minimalist Studio Room in Loop",
    shortDescription: "A clean, peaceful high-rise bedroom in Downtown Chicago with breathtaking floor-to-ceiling city views.",
    fullDescription: "Located on the 24th floor, this private co-living room offers unmatched views of the Chicago skyline. Features premium sound insulation, an ergonomic workstation, and smart lights. Shared amenities include a state-of-the-art gym, indoor pool, and a fully equipped co-working lounge. All utilities and high-speed fiber internet are covered.",
    price: 850,
    location: "Chicago, IL",
    moveInDate: new Date("2026-09-01"),
    amenities: ["Fiber Wifi", "Air Conditioning", "State-of-the-art Gym", "Indoor Pool", "Co-working Lounge", "Elevator"],
    images: [
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&auto=format&fit=crop"
    ],
  },
  {
    title: "Cozy Garden Room in Capitol Hill",
    shortDescription: "Charming basement suite with private bathroom and direct access to a lush vegetable garden.",
    fullDescription: "This warm, wood-paneled room is located in a classic Craftsman home in Seattle. It has its own private entrance and private bath, sharing the top-floor gourmet kitchen and living room. Enjoy access to our organic vegetable garden and cozy fire pit. Friendly hosts and a quiet, tree-lined neighborhood.",
    price: 950,
    location: "Seattle, WA",
    moveInDate: new Date("2026-08-10"),
    amenities: ["High-speed Wifi", "Private Bathroom", "Private Entrance", "Vegetable Garden", "Fire Pit"],
    images: [
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop"
    ],
  },
  {
    title: "Bright Ocean Breeze Room in Santa Monica",
    shortDescription: "A gorgeous, light-filled bedroom with a shared balcony, just minutes from the Santa Monica beach.",
    fullDescription: "Wake up to the sound of waves! This coastal co-living room has hardwood floors, large windows, and custom linen curtains. The apartment has a spacious ocean-facing balcony, parking space, and surf storage. Perfect for beach lovers, remote workers, and active individuals.",
    price: 1400,
    location: "Los Angeles, CA",
    moveInDate: new Date("2026-09-15"),
    amenities: ["High-speed Wifi", "Ocean Balcony", "Air Conditioning", "Parking Space", "Surfboard Storage"],
    images: [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1617806118233-18e1db207f62?w=800&auto=format&fit=crop"
    ],
  },
  {
    title: "Editorial Vintage Space in Wicker Park",
    shortDescription: "Chic mid-century co-living flat with rich wood textures, local art, and a record player setup.",
    fullDescription: "A beautifully curated double bedroom in a high-character Wicker Park apartment. The space is filled with vintage finds, plants, and natural fibers. Shared features include a vinyl listening station, a custom espresso bar, and a retro kitchen. Sharing with two quiet young professionals.",
    price: 900,
    location: "Chicago, IL",
    moveInDate: new Date("2026-08-20"),
    amenities: ["High-speed Wifi", "Vinyl Listening Station", "Espresso Bar", "Laundry in building", "Air Conditioning"],
    images: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&auto=format&fit=crop"
    ],
  }
];

async function seed() {
  try {
    console.log("Starting database seed script...");
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) throw new Error("No DB connection");

    // Initialize Better Auth to ensure collections and configurations are ready
    const auth = initAuth();

    // Drop custom collections to clear any stale indexes (like sessionId_1_reviewerId_1)
    console.log("Dropping existing listings and reviews collections...");
    try { await db.collection("listings").drop(); } catch (_) {}
    try { await db.collection("reviews").drop(); } catch (_) {}
    
    // Drop Better Auth managed collections to clear any stale indexes (like handle_1)
    const collections = ["users", "sessions", "accounts", "verifications"];
    for (const col of collections) {
      try { 
        await db.collection(col).drop(); 
        console.log(`Dropped collection: ${col}`);
      } catch (_) {}
    }

    // Create users using Better Auth server-side API to ensure proper hashing and format
    console.log("Creating users via Better Auth API...");
    
    const usersData = [
      { email: "demo@nestfind.com", name: "Alex Mercer", password: "Password123!" },
      { email: "sarah.host@nestfind.com", name: "Sarah Jenkins", password: "Password123!" },
      { email: "david.renter@nestfind.com", name: "David Chen", password: "Password123!" },
      { email: "emma.watson@nestfind.com", name: "Emma Watson", password: "Password123!" },
    ];

    const createdUsers: any[] = [];
    
    for (const u of usersData) {
      const result = await auth.api.signUpEmail({
        body: {
          email: u.email,
          password: u.password,
          name: u.name,
        },
      });
      createdUsers.push(result.user);
      console.log(`Created user: ${result.user.name} <${result.user.email}>`);
    }

    // Create listings
    console.log("Creating listings...");
    const createdListings: any[] = [];
    
    for (let i = 0; i < listingsTemplate.length; i++) {
      const template = listingsTemplate[i];
      // Alternate owners between Sarah (index 1) and Alex/demo (index 0)
      const ownerId = i % 2 === 0 ? createdUsers[1].id : createdUsers[0].id;
      
      const listing = new Listing({ ...template, ownerId });
      await listing.save();
      console.log(`Listing seeded: "${listing.title}"`);
      createdListings.push(listing);
    }

    // Create reviews
    console.log("Creating reviews...");
    
    const reviewsData = [
      { listingIdx: 0, userIdx: 2, rating: 5, comment: "This loft is absolutely gorgeous! The terracotta tiles and brick walls make it feel like a boutique hotel. Sarah is an amazing host — always responsive and keeps the shared areas spotless. Highly recommended!" },
      { listingIdx: 1, userIdx: 3, rating: 4, comment: "Perfect location near the trains. The roommates are quiet and respectful. The shared garden is a great bonus. The bedroom can get a little chilly in the mornings, but overall a wonderful place to live." },
      { listingIdx: 4, userIdx: 0, rating: 5, comment: "Living here has been an absolute dream. The beach is a short walk away and the balcony views are unbelievable. Alex and David are super friendly. Would give 6 stars if I could!" },
    ];

    const now = new Date();
    for (const r of reviewsData) {
      await db.collection("reviews").insertOne({
        listingId: createdListings[r.listingIdx]._id,
        userId: createdUsers[r.userIdx].id,
        rating: r.rating,
        comment: r.comment,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log("\n✅ Database seeded successfully!");
    console.log("-----------------------------------");
    console.log("Demo user credentials:");
    console.log("  Email:    demo@nestfind.com");
    console.log("  Password: Password123!");
    console.log("-----------------------------------\n");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
