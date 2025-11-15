import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    profile: {
      type: String,
      required: true, // Added: Align with validation
    },
    dob: {
      type: Date,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
      unique: true,
    },
    occupation: {
      type: String,
      required: true,
    },
    Salary: { // Consider renaming to 'salary' for camelCase consistency
      type: Number,
      required: true, // Added: Align with validation
    },
    Address: { // Consider renaming to 'address'
      type: String,
      required: true,
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
    proof1: {
      type: String,
      required: true, // Added: Align with validation
    },
    proof2: {
      type: String,
      required: true, // Added: Align with validation
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", UserSchema);

export default User;