import Agent from "../Models/AgentModel.js";
import User from "../Models/userModel.js";
import {v2 as cloudinary} from "cloudinary";
import Vasool from "../Models/VasoolModel.js";



export const NewUser = async (req, res) => { // Suggested rename: createNewUser
  try {
    const normalized = {};
    for (const [rawKey, value] of Object.entries(req.body || {})) {
      if (rawKey.includes('[') && rawKey.includes(']')) {
        const parts = rawKey.replace(/\]/g, '').split('[');
        let cur = normalized; // Fix already applied: Scoped per iteration
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i].trim(); // Trim for safety
          if (i === parts.length - 1) {
            cur[p] = value;
          } else {
            cur[p] = cur[p] || {};
            cur = cur[p];
          }
        }
      } else {
        normalized[rawKey] = value;
      }
    }
    const body = normalized;
    
    // Extract files from req.files (multer with fields())
    const uploadedProfile = req.files?.profile?.[0] || null;
    const uploadedProof1 = req.files?.proof1?.[0] || null;
    const uploadedProof2 = req.files?.proof2?.[0] || null;
    
    const {
      name,
      dob,
      phone: phoneStr,
      occupation,
      Salary: salaryStr,
      Address: addressStr,
    } = body;
    // Convert types to match model (numbers)
    const phone = phoneStr !== undefined ? Number(String(phoneStr).trim()) : NaN;
    const salary = salaryStr !== undefined ? Number(String(salaryStr).trim()) : NaN;
    // Validation
    const missing = [];
    if (!uploadedProfile) missing.push('profile');
    if (!name || !name.trim()) missing.push('name');
    if (!dob) missing.push('dob');
    if (!phone || Number.isNaN(phone)) missing.push('phone');
    if (!occupation || !occupation.trim()) missing.push('occupation');
    if (!salary || Number.isNaN(salary)) missing.push('Salary');
    if (!addressStr || !addressStr.trim()) missing.push('Address');
    if (!uploadedProof1) missing.push('proof1');
    if (!uploadedProof2) missing.push('proof2');
    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing or invalid fields', missing });
    }
    // Upload profile image to Cloudinary
    let profileValue;
    if (uploadedProfile && uploadedProfile.buffer) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'users/profiles',
              resource_type: 'image',
              transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error for profile:', error); // Suggested: Use structured logger
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          uploadStream.end(uploadedProfile.buffer);
        });
        profileValue = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Failed to upload profile to Cloudinary:', uploadError);
        return res.status(500).json({ 
          error: 'Failed to upload profile image to cloud storage',
          details: uploadError.message 
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid profile image format' });
    }
    
    // Upload proof1 image to Cloudinary
    let proof1Value;
    if (uploadedProof1 && uploadedProof1.buffer) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'users/proofs',
              resource_type: 'image',
              transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error for proof1:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          uploadStream.end(uploadedProof1.buffer);
        });
        proof1Value = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Failed to upload proof1 to Cloudinary:', uploadError);
        return res.status(500).json({ 
          error: 'Failed to upload proof1 image to cloud storage',
          details: uploadError.message 
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid proof1 image format' });
    }
    
    // Upload proof2 image to Cloudinary
    let proof2Value;
    if (uploadedProof2 && uploadedProof2.buffer) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'users/proofs',
              resource_type: 'image',
              transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error for proof2:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          uploadStream.end(uploadedProof2.buffer);
        });
        proof2Value = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Failed to upload proof2 to Cloudinary:', uploadError);
        return res.status(500).json({ 
          error: 'Failed to upload proof2 image to cloud storage',
          details: uploadError.message 
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid proof2 image format' });
    }
    // Check existing user: Enhanced with phone check
    const existingByIdentity = await User.findOne({ name: name.trim(), dob });
    if (existingByIdentity) {
      return res.status(400).json({ message: "User with this name and date of birth already exists" });
    }
    const existingByPhone = await User.findOne({ phone });
    if (existingByPhone) {
      return res.status(400).json({ message: "Phone number already in use" });
    }
    // Create user document matching your model
    const newUser = new User({
      name: name.trim(),
      profile: profileValue,
      dob,
      phone,
      occupation: occupation.trim(),
      Salary: salary,
      Address: addressStr.trim(),
      proof1: proof1Value,
      proof2: proof2Value,
      vasool: [], // Explicitly set for clarity
    });
    const savedUser = await newUser.save();
    return res.status(201).json({ // Changed to 201 for creation
      message: "New user created successfully",
      data: savedUser,
      userId: savedUser._id, // Added: Useful for client
    });
  } catch (error) {
    console.error("Error creating new user:", error);
    return res.status(500).json({ message: "Internal server error", details: error.message });
  }
};



export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate({
      path: 'vasool',
      populate: { path: 'agentId', model: 'Agent' }
    }); 
    return res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Internal server error", details: error.message });
  }
};


export const newAgent = async (req, res) => {
  const { name, phone, address, commissionRate } = req.body;
  try {
    // Check if agent with the same phone number already exists
    const existingAgent = await Agent.findOne({ phone });
    if (existingAgent) {
      return res.status(400).json({ message: "Agent with this phone number already exists" });
    } 
    const newAgent = new Agent({
      name,
      phone,
      address,
      commissionRate
    });
    const savedAgent = await newAgent.save();
    return res.status(200).json({ 
      message: "New agent created successfully", 
      data: savedAgent 
    });
  } catch (error) {
    console.error("Error creating new agent:", error);
    return res.status(500).json({ message: "Internal server error", details: error.message });
  }
}


export const allAgent = async (req, res) => {
  try {
    const agents = await Agent.find();
    return res.status(200).json({ data: agents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return res.status(500).json({ message: "Internal server error", details: error.message });
  }
}



export const BookingVasool = async (req, res) => {
  try {
    const { userId, agentId, amount, startingDate } = req.body;

    // Validate user existence
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Validate agent existence
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const AgentAmount = amount/agent.commissionRate 
    agent.amount = agent.amount + AgentAmount;
    await agent.save();

    const newVasool = new Vasool({
      userId,
      agentId,
      amount,
      startingDate
    });
    const savedVasool = await newVasool.save();

    user.vasool.push(savedVasool._id);
    await user.save();

    return res.status(200).json({
      message: "Vasool booked successfully",
      data: savedVasool
    });
  } catch (error) {
    console.error("Error booking vasool:", error);
    return res.status(500).json({ message: "Internal server error", details: error.message });
  }
}


export const allVasool = async (req, res) => {
  try {
    const vasools = await Vasool.find({status: "active"}).populate('userId').populate('agentId');
    return res.status(200).json({ data: vasools });
  } catch (error) {
    console.error("Error fetching vasools:", error);
    return res.status(500).json({ message: "Internal server error", details: error.message });
  }
}


// controllers/vasoolController.js
export const vasoolPayment = async (req, res) => {
  try {
    const { vasoolId } = req.params;
    const { amount, status } = req.body;

    // Strict: only "paid" or "due"
    if (!["paid", "due"].includes(status)) {
      return res.status(400).json({
        message: 'Status must be either "paid" or "due" only',
      });
    }

    if (status === "paid") {
      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
          message: "Amount is required and must be positive when status is paid",
        });
      }
    }

    let vasool = await Vasool.findById(vasoolId).populate("userId");
    if (!vasool) return res.status(404).json({ message: "Vasool not found" });

    const weeklyInstallment = vasool.amount / 10
    if (!weeklyInstallment || weeklyInstallment <= 0) {
      return res.status(400).json({ message: "Weekly installment not configured" });
    }

    // One entry per day only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const alreadyEntry = vasool.payments?.some(p => {
      const pDate = new Date(p.date);
      return pDate >= today && pDate <= todayEnd;
    });

    if (alreadyEntry) {
      return res.status(400).json({
        message: "Already one entry exists for today",
      });
    }

    let collectedChange = 0;
    let pendingChange = 0;
    let recordedAmount = 0;
    let note = "";

    if (status === "paid") {
      recordedAmount = amount;
      collectedChange = amount;

      if (amount >= weeklyInstallment) {
        const extra = amount - weeklyInstallment;
        note = extra > 0 ? "Extra paid – reduced old pending" : "Full weekly paid";

        if (extra > 0 && vasool.pendingAmount > 0) {
          const reduceBy = Math.min(extra, vasool.pendingAmount);
          pendingChange -= reduceBy;
        }
      } else {
        const shortfall = weeklyInstallment - amount;
        pendingChange += shortfall;
        note = "Partial paid – shortfall added to pending";
      }
    } else if (status === "due") {
      recordedAmount = weeklyInstallment;
      pendingChange += weeklyInstallment;
      note = "Weekly payment missed – marked as due";
    }

    // Calculate new pending (never negative)
    const tempPending = vasool.pendingAmount + pendingChange;
    const newPending = Math.max(0, tempPending);

    // Check if today is the endingDate
    const todayDateOnly = new Date(today);
    todayDateOnly.setHours(0, 0, 0, 0);
    const endingDateOnly = new Date(vasool.endingDate);
    endingDateOnly.setHours(0, 0, 0, 0);

    const isLastDay = todayDateOnly.getTime() === endingDateOnly.getTime();

    // Determine final status
    let finalStatus = vasool.status; // default keep current

    if (isLastDay) {
      if (newPending === 0) {
        finalStatus = "completed";
      } else {
        finalStatus = "arrear";
      }
    } else {
      // Not last day → keep active (or whatever it was, but usually active)
      finalStatus = "active";
    }

    const newPayment = {
      amount: recordedAmount,
      status, // "paid" or "due"
      date: new Date(),
      note,
    };

    const updatedVasool = await Vasool.findByIdAndUpdate(
      vasoolId,
      {
        $push: { payments: newPayment },
        $inc: {
          collectedAmount: collectedChange,
        },
        $set: {
          pendingAmount: newPending,
          status: finalStatus, // auto update completed or arrear on last day
        },
      },
      { new: true }
    ).populate("userId");

    // Push notification full-a remove pannitten as per your request

    return res.status(200).json({
      message: "Vasool entry successful",
      data: {
        type: status,
        amountRecorded: recordedAmount,
        collectedToday: collectedChange,
        previousPending: vasool.pendingAmount,
        pendingChange,
        newPendingAmount: newPending,
        vasoolStatus: finalStatus,
        isLastDay,
        endingDate: vasool.endingDate,
        note,
        totalCollected: updatedVasool.collectedAmount,
      },
    });

  } catch (error) {
    console.error("Vasool Payment Error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};