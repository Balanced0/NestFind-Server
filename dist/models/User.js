import mongoose, { Schema } from "mongoose";
const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },
}, {
    timestamps: true,
    collection: "users",
});
export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
