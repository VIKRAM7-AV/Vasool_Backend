import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    profile: {
      type: String
    },
    phone: {
      type: Number,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'missing'],
      default: 'active'
    },
    vasool: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vasool",
        required: true
      },
    ],
    proof: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", UserSchema);

export default User;