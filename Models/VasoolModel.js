import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["paid", "due", "pending"], default: "pending" },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const VasoolSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    pendingAmount: { type: Number, default: 0 },
    collectedAmount: { type: Number, default: 0 },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Agent",
        default: null
    },
    amount: { type: Number, required: true },
    bookingType: {
        type: String,
        enum: ["10 weeks", "50 days", "100 days"], // Your Enum values
        required: true
    },
    startingDate: { type: Date, required: true },
    endingDate: { type: Date },
    status: {
      type: String,
      enum: ["active", "completed", "missing", "arrear"],
      default: "active",
    },
    payments: [paymentSchema],
    
}, { timestamps: true });

// --- UPDATED PRE-SAVE HOOK ---
VasoolSchema.pre("save", function (next) {
  if (!this.isNew || !this.startingDate || this.endingDate) {
    return next();
  }

  // 🔒 Normalize to noon (12:00 PM)
  const start = new Date(this.startingDate);
  start.setHours(12, 0, 0, 0);

  const addDaysSkippingSundays = (startDate, days) => {
    let date = new Date(startDate);
    let count = 0;

    while (count < days) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0) count++;
    }
    return date;
  };

  switch (this.bookingType) {
    case "10 weeks": {
      const end = new Date(start);
      end.setDate(end.getDate() + 63);
      this.endingDate = end;
      break;
    }

    case "50 days": {
      this.endingDate = addDaysSkippingSundays(start, 50);
      break;
    }

    case "100 days": {
      this.endingDate = addDaysSkippingSundays(start, 100);
      break;
    }
  }

  next();
});



const Vasool = mongoose.model("Vasool", VasoolSchema);

export default Vasool;