import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  listingId: mongoose.Types.ObjectId;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    userId: { type: String, required: true }, // Referencing Better Auth user id (string)
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Review = mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);
export default Review;
