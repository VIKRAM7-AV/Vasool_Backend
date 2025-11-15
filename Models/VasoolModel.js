import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ["paid", "due", "pending"], default: "pending" },
  },
  { _id: false }
);

const VasoolSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    pendingAmount: {
        type: Number,
        default: 0
    },
    collectedAmount: {
        type: Number,
        default: 0
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Agent",
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    startingDate: {
        type: Date,
        required: true
    },
    endingDate: {
        type: Date
    },
    status: {
      type: String,
      enum: ["active", "completed", "closed", "arrear"],
      default: "active",
    },
    payments: [paymentSchema],
    
}, { timestamps: true });

// Pre-save hook to automatically set endingDate to the 10th Saturday from startingDate and populate payments
VasoolSchema.pre('save', function(next) {
  if (this.isNew && this.startingDate && !this.endingDate) {
    const start = new Date(this.startingDate);
    const currentDay = start.getDay();
    let daysToSaturday = 6 - currentDay;
    const firstSaturday = new Date(start.getTime() + daysToSaturday * 24 * 60 * 60 * 1000);
    
    // Set endingDate to the 10th Saturday (9 weeks after first)
    this.endingDate = new Date(firstSaturday.getTime() + 9 * 7 * 24 * 60 * 60 * 1000);
    
  }
  next();
});

const Vasool = mongoose.model("Vasool", VasoolSchema);

export default Vasool;