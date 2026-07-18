import mongoose, { Schema } from "mongoose";
const ReviewSchema = new Schema({
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    userId: { type: String, required: true }, // Referencing Better Auth user id (string)
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
}, {
    timestamps: true,
});
export const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);
export default Review;
