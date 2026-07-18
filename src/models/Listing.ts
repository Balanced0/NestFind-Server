import mongoose, { Schema, Document } from "mongoose";

export interface IListing extends Document {
  title: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  location: string;
  moveInDate: Date;
  amenities: string[];
  images: string[];
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    moveInDate: { type: Date, required: true },
    amenities: { type: [String], default: [] },
    images: { type: [String], default: [] },
    ownerId: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Add text index for search
ListingSchema.index({ title: "text", shortDescription: "text", fullDescription: "text", location: "text" });

export const Listing = mongoose.models.Listing || mongoose.model<IListing>("Listing", ListingSchema);
export default Listing;
