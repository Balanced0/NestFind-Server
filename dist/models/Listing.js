import mongoose, { Schema } from "mongoose";
const ListingSchema = new Schema({
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    moveInDate: { type: Date, required: true },
    amenities: { type: [String], default: [] },
    images: { type: [String], default: [] },
    ownerId: { type: String, required: true },
}, {
    timestamps: true,
});
// Add text index for search
ListingSchema.index({ title: "text", shortDescription: "text", fullDescription: "text", location: "text" });
export const Listing = mongoose.models.Listing || mongoose.model("Listing", ListingSchema);
export default Listing;
