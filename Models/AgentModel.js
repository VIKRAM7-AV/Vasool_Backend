import mongoose from "mongoose";

const AgentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String,
        required: true
    },
    commissionRate: {
        type: Number,
        required: true
    },
    amount:{
        type: Number
    }
}, { timestamps: true });

const Agent = mongoose.model("Agent", AgentSchema);

export default Agent;