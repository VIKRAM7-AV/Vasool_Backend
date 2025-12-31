import Agent from "../Models/AgentModel.js";
import User from "../Models/userModel.js";
import { v2 as cloudinary } from "cloudinary";
import Vasool from "../Models/VasoolModel.js";
import Admin from "../Models/AdminModel.js";

export const NewUser = async (req, res) => {
  try {
    /* ---------------- Normalize nested body ---------------- */
    const normalized = {};
    for (const [rawKey, value] of Object.entries(req.body || {})) {
      if (rawKey.includes("[") && rawKey.includes("]")) {
        const parts = rawKey.replace(/\]/g, "").split("[");
        let cur = normalized;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i].trim();
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

    /* ---------------- Files ---------------- */
    const uploadedProfile = req.files?.profile?.[0] || null;
    const uploadedProof1 = req.files?.proof1?.[0] || null;

    const { name, phone: phoneStr } = body;

    const phone =
      phoneStr !== undefined ? Number(String(phoneStr).trim()) : NaN;

    /* ---------------- Validation ---------------- */
    const missing = [];
    if (!name || !name.trim()) missing.push("name");
    if (!phone || Number.isNaN(phone)) missing.push("phone");

    if (missing.length > 0) {
      return res.status(400).json({
        error: "Missing or invalid fields",
        missing,
      });
    }

    /* ---------------- Check existing user ---------------- */
    const existingByPhone = await User.findOne({ phone });
    if (existingByPhone) {
      return res.status(400).json({
        message: "Phone number already in use",
      });
    }

    /* ---------------- Uploads (OPTIONAL) ---------------- */
    // Profile upload (optional, only store if present)
    let profileValue = null;
    if (uploadedProfile?.buffer) {
      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "users/profiles",
              resource_type: "image",
              transformation: [
                { width: 500, height: 500, crop: "limit", quality: "auto" },
              ],
            },
            (err, res) => (err ? reject(err) : resolve(res))
          );
          stream.end(uploadedProfile.buffer);
        });
        profileValue = result.secure_url;
      } catch (err) {
        console.error("Profile upload failed:", err);
      }
    }

    // Proof1 upload (optional, only store if present)
    let proof1Value = null;
    if (uploadedProof1?.buffer) {
      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "users/proofs",
              resource_type: "image",
              transformation: [
                { width: 800, height: 600, crop: "limit", quality: "auto" },
              ],
            },
            (err, res) => (err ? reject(err) : resolve(res))
          );
          stream.end(uploadedProof1.buffer);
        });
        proof1Value = result.secure_url;
      } catch (err) {
        console.error("Proof upload failed:", err);
      }
    }


    /* ---------------- Create User ---------------- */
    const newUser = new User({
      name: name.trim(),
      phone,
      vasool: [],
      ...(profileValue && { profile: profileValue }),
      ...(proof1Value && { proof: proof1Value }),
    });

    const savedUser = await newUser.save();

    return res.status(201).json({
      message: "New user created successfully",
      data: savedUser,
      userId: savedUser._id,
    });
  } catch (error) {
    console.error("Error creating new user:", error);
    return res.status(500).json({
      message: "Internal server error",
      details: error.message,
    });
  }
};

export const UpdateUser = async (req, res) => {
  try {
    const { id } = req.params; // Assume you pass the user ID in the URL: /users/:id
    
    /* ---------------- Normalize nested body (Same as your logic) ---------------- */
    const normalized = {};
    for (const [rawKey, value] of Object.entries(req.body || {})) {
      if (rawKey.includes("[") && rawKey.includes("]")) {
        const parts = rawKey.replace(/\]/g, "").split("[");
        let cur = normalized;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i].trim();
          if (i === parts.length - 1) cur[p] = value;
          else { cur[p] = cur[p] || {}; cur = cur[p]; }
        }
      } else {
        normalized[rawKey] = value;
      }
    }

    // 1. Check if user exists
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Prepare the dynamic update object
    const updateData = {};

    // --- Update Name ---
    if (normalized.name) updateData.name = normalized.name.trim();

    // --- Update Phone ---
    if (normalized.phone) {
      const phoneNum = Number(String(normalized.phone).trim());
      if (Number.isNaN(phoneNum)) return res.status(400).json({ error: "Invalid phone format" });
      
      // Check if phone is taken by someone else
      const existing = await User.findOne({ phone: phoneNum, _id: { $ne: id } });
      if (existing) return res.status(400).json({ message: "Phone number already in use" });
      
      updateData.phone = phoneNum;
    }

    // --- Update Profile Image (Cloudinary) ---
    if (req.files?.profile?.[0]?.buffer) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "users/profiles", transformation: [{ width: 500, height: 500, crop: "limit" }] },
          (err, res) => (err ? reject(err) : resolve(res))
        );
        stream.end(req.files.profile[0].buffer);
      });
      updateData.profile = result.secure_url;
    }

    // --- Update Proof Image (Cloudinary) ---
    if (req.files?.proof1?.[0]?.buffer) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "users/proofs", transformation: [{ width: 800, height: 600, crop: "limit" }] },
          (err, res) => (err ? reject(err) : resolve(res))
        );
        stream.end(req.files.proof1[0].buffer);
      });
      updateData.proof = result.secure_url;
    }

    // 3. Perform the update
    // { new: true } returns the updated document
    const updatedUser = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    return res.status(200).json({
      message: "User updated successfully",
      data: updatedUser,
    });

  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Internal server error", details: error.message });
  }
};


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate({
      path: "vasool",
      populate: { path: "agentId", model: "Agent" },
    });
    return res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", details: error.message });
  }
};

export const newAgent = async (req, res) => {
  const { name, phone, address, commissionRate } = req.body;
  try {
    // Check if agent with the same phone number already exists
    const existingAgent = await Agent.findOne({ phone });
    if (existingAgent) {
      return res
        .status(400)
        .json({ message: "Agent with this phone number already exists" });
    }
    const newAgent = new Agent({
      name,
      phone,
      address,
      commissionRate,
    });
    const savedAgent = await newAgent.save();
    return res.status(200).json({
      message: "New agent created successfully",
      data: savedAgent,
    });
  } catch (error) {
    console.error("Error creating new agent:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", details: error.message });
  }
};

export const allAgent = async (req, res) => {
  try {
    const agents = await Agent.find();
    return res.status(200).json({ data: agents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", details: error.message });
  }
};

export const updateAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { name, phone, address, commissionRate } = req.body;

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // Check if phone is being updated and already exists for another agent
    if (phone && phone !== agent.phone) {
      const existingAgent = await Agent.findOne({ phone, _id: { $ne: agentId } });
      if (existingAgent) {
        return res.status(400).json({ message: "Phone number already in use by another agent" });
      }
    }

    // Update fields if provided
    if (name) agent.name = name;
    if (phone) agent.phone = phone;
    if (address) agent.address = address;
    if (commissionRate !== undefined) agent.commissionRate = commissionRate;

    const updatedAgent = await agent.save();

    return res.status(200).json({
      message: "Agent updated successfully",
      data: updatedAgent,
    });
  } catch (error) {
    console.error("Error updating agent:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", details: error.message });
  }
};

export const BookingVasool = async (req, res) => {
  try {
    const { userId, agentId, amount, startingDate, bookingType } = req.body;

    // 1. Validate user existence
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Validate bookingType
    const validBookingTypes = ["10 weeks", "50 days", "100 days"];
    if (!bookingType || !validBookingTypes.includes(bookingType)) {
      return res.status(400).json({ 
        message: "Invalid bookingType. Must be '10 weeks', '50 days', or '100 days'" 
      });
    }

    // ---------------------------------------------------------
    // >>> NEW: Reduce Admin Balance (80% of Loan Amount) <<<
    // ---------------------------------------------------------
    const disbursementAmount = amount * 0.80; // Calculate 80%

    const admin = await Admin.findOne();
    if (!admin) {
        // Admin not initialized — reject booking
        console.warn("Warning: No Admin account found for disbursement.");
        return res.status(500).json({ message: "Admin account not initialized" });
    }

    // Ensure Admin has sufficient balance before disbursing
    const currentBalance = admin.balanceAmount || 0;
    if (currentBalance < disbursementAmount) {
        return res.status(400).json({ message: "Insufficient admin balance for disbursement" });
    }

    // Deduct the disbursement amount from Admin's balance
    admin.balanceAmount = currentBalance - disbursementAmount;
    await admin.save();
    // ---------------------------------------------------------

    // 3. Prepare data object
    const vasoolData = {
      userId,
      amount,
      startingDate,
      bookingType,
      // CORRECTED: Set pendingAmount to the full loan amount initially
      pendingAmount: 0, 
      collectedAmount: 0,
      status: "active"
    };

    // 4. Handle Agent ID
    if (agentId) {
      vasoolData.agentId = agentId;
    }

    // 5. Create and Save (Pre-save hook in model will calculate endingDate)
    const newVasool = new Vasool(vasoolData);
    const savedVasool = await newVasool.save();

    // 6. Push to User array
    user.vasool.push(savedVasool._id);
    await user.save();

    return res.status(200).json({
      message: "Vasool booked successfully",
      data: savedVasool,
      adminDeduction: disbursementAmount // Optional: Return what was deducted
    });

  } catch (error) {
    console.error("Error booking vasool:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", details: error.message });
  }
};

export const allVasool = async (req, res) => {
  try {
    const vasools = await Vasool.find({ status: "active" })
      .populate("userId")
      .populate("agentId");
    return res.status(200).json({ data: vasools });
  } catch (error) {
    console.error("Error fetching vasools:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", details: error.message });
  }
};


export const arrearVasool = async (req, res) => {
  try {
    const vasools = await Vasool.find({ status: "arrear" })
      .populate("userId")
      .populate("agentId");
    return res.status(200).json({ data: vasools });
  } catch (error) {
    console.error("Error fetching vasools:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", details: error.message });
  }
};



export const allVasools = async (req, res) => {
  try {
    const vasools = await Vasool.find()
      .populate("userId")
      .populate("agentId");
    return res.status(200).json({ data: vasools });
  } catch (error) {
    console.error("Error fetching vasools:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", details: error.message });
  }
};



export const expectAmount = async (req, res) => {
  try {
    // 1. Setup Time Boundaries for "Today"
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // Today 00:00:00

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999); // Today 23:59:59

    const dayIndex = startOfToday.getDay(); // 0 = Sunday, 6 = Saturday
    const isSaturday = dayIndex === 6;
    const isSunday = dayIndex === 0;

    // Optional: Skip Sunday
    if (isSunday) {
        return res.status(200).json({ totalExpectedAmount: 0, message: "No collection on Sundays" });
    }

    // 2. Fetch Active Bookings (Fixed Date Logic)
    // Logic: The booking must have STARTED before today ends AND must END after today starts.
    const bookings = await Vasool.find({
      status: "active",
      startingDate: { $lte: endOfToday }, 
      endingDate: { $gte: startOfToday } 
    });

    let totalExpectedAmount = 0;

    // 3. Calculate Amount
    for (const booking of bookings) {
      // Daily: 50 Days
      if (booking.bookingType === "50 days") {
        totalExpectedAmount += (booking.amount / 50);
      } 
      // Daily: 100 Days
      else if (booking.bookingType === "100 days") {
        totalExpectedAmount += (booking.amount / 100);
      }
      // Weekly: 10 Weeks (Only on Saturday)
      else if (booking.bookingType === "10 weeks" && isSaturday) {
        totalExpectedAmount += (booking.amount / 10);
      }
    }

    return res.status(200).json({
      success: true,
      totalExpectedAmount: Math.round(totalExpectedAmount),
      isSaturday: isSaturday,
      activeCount: bookings.length
    });

  } catch (error) {
    console.error("Error fetching expected amount:", error);
    return res.status(500).json({ message: "Internal server error", details: error.message });
  }
};


export const vasoolPayment = async (req, res) => {
  try {
    const { vasoolId } = req.params;
    const { amount, status, date } = req.body;

    // 1. Validation
    if (!["paid", "due"].includes(status)) {
      return res.status(400).json({ message: 'Status must be "paid" or "due"' });
    }

    if (status === "paid" && (!amount || amount <= 0)) {
      return res.status(400).json({ message: "Valid amount required for payment" });
    }

    // Parse the Payment Date (set time to 00:00:00 for accurate date comparison)
    const inputDate = date ? new Date(date) : new Date();
    const compareDate = new Date(inputDate);
    compareDate.setHours(0, 0, 0, 0);

    // 2. Fetch Vasool
    let vasool = await Vasool.findById(vasoolId).populate("userId");
    if (!vasool) return res.status(404).json({ message: "Vasool not found" });

    // 3. Determine Installment Amount
    let installmentAmount = 0;
    if (vasool.bookingType === "10 weeks") installmentAmount = vasool.amount / 10;
    else if (vasool.bookingType === "50 days") installmentAmount = vasool.amount / 50;
    else if (vasool.bookingType === "100 days") installmentAmount = vasool.amount / 100;

    // ---------------------------------------------------------
    // >>> LOGIC: CHECK IF ENTRY ALREADY EXISTS FOR THIS DATE <<<
    // ---------------------------------------------------------
    const existingPaymentIndex = vasool.payments.findIndex((p) => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate.getTime() === compareDate.getTime() && p.status === "due";
    });

    let note = "";
    let recordedAmount = amount || 0;
    let isLastDay = false;

    // SCENARIO A: UPDATING AN EXISTING "DUE" TO "PAID"
    if (existingPaymentIndex !== -1 && status === "paid") {
      
      // Update the specific payment entry in the array
      vasool.payments[existingPaymentIndex].status = "paid";
      vasool.payments[existingPaymentIndex].amount = amount;
      vasool.payments[existingPaymentIndex].createdAt = new Date(); // Update time to now
      
      // LOGIC: Since it was "Due" before, the installment was ALREADY added to pending.
      // So now we just subtract the paid amount from pending.
      vasool.collectedAmount += amount;
      vasool.pendingAmount -= amount; 
      
      note = "Cleared previous Due - Pending reduced";

      // Update Admin Balance (Cash Flow)
      const adminForBalance = await Admin.findOne();
      if (adminForBalance) {
        adminForBalance.balanceAmount = (adminForBalance.balanceAmount || 0) + amount;
        await adminForBalance.save();
      }

    } 
    // SCENARIO B: NEW PAYMENT ENTRY (Standard Logic)
    else {
      let pendingChange = 0;
      let collectedChange = 0;

      if (status === "paid") {
        collectedChange = amount;

        // Update Admin Balance
        const adminForBalance = await Admin.findOne();
        if (adminForBalance) {
          adminForBalance.balanceAmount = (adminForBalance.balanceAmount || 0) + amount;
          await adminForBalance.save();
        }

        // Standard Pending Calculation
        if (amount >= installmentAmount) {
          const extra = amount - installmentAmount;
          if (extra > 0 && vasool.pendingAmount > 0) {
            const reduceBy = Math.min(extra, vasool.pendingAmount);
            pendingChange = -reduceBy; // Reduce pending
            note = "Paid full + reduced old pending";
          } else {
            note = "Installment paid successfully";
          }
        } else {
          const shortfall = installmentAmount - amount;
          pendingChange = shortfall; // Add shortfall to pending
          note = "Partial payment - Shortfall added";
        }

      } else if (status === "due") {
        recordedAmount = 0;
        pendingChange = installmentAmount; // Full installment added to pending
        note = "Marked as Due";
      }

      // Apply changes
      vasool.collectedAmount += collectedChange;
      vasool.pendingAmount += pendingChange;

      // Push NEW payment entry
      vasool.payments.push({
        amount: recordedAmount,
        status,
        date: inputDate,
        note,
        createdAt: new Date()
      });
    }

    // Ensure Pending is never negative
    vasool.pendingAmount = Math.max(0, vasool.pendingAmount);

    // 4. Check Status (Completed / Arrear)
    const endingDate = new Date(vasool.endingDate);
    endingDate.setHours(0, 0, 0, 0);

    isLastDay = compareDate.getTime() >= endingDate.getTime();
    const isFullyPaid = vasool.collectedAmount >= vasool.amount && vasool.pendingAmount === 0;

    let finalStatus = vasool.status;

    if (isLastDay || isFullyPaid) {
      if (vasool.pendingAmount === 0) {
        finalStatus = "completed";
      } else {
        finalStatus = "arrear";
      }
    }

    // 5. Handle Commission & Profit (Only if status changes to Completed)
if (finalStatus === "completed" && vasool.status !== "completed") {

  // 1️⃣ Total Interest = 20% of loan amount
  const totalInterestGain = vasool.amount * 0.20;

  let agentShare = 0;
  let adminShare = totalInterestGain;

  // 2️⃣ Agent Commission = % of LOAN AMOUNT
  if (vasool.agentId) {
    const agent = await Agent.findById(vasool.agentId);

    if (agent && agent.commissionRate > 0) {
      // commissionRate = 10 → 10% of loan amount
      agentShare =
        vasool.amount * (agent.commissionRate / 100);

      // ❗ Safety: Agent commission must not exceed interest
      if (agentShare > totalInterestGain) {
        agentShare = totalInterestGain;
      }

      // Update Agent Wallet
      agent.amount = (agent.amount || 0) + agentShare;
      await agent.save();

      // Admin gets remaining interest
      adminShare = totalInterestGain - agentShare;
    }
  }

  // 3️⃣ Safety check
  if (adminShare < 0) adminShare = 0;

  // 4️⃣ Update Admin Wallet
  const admin = await Admin.findOne();
  if (admin) {
    admin.currentAmount =
      (admin.currentAmount || 0) + adminShare;
    await admin.save();
  }
}


    // 6. Final Save
    vasool.status = finalStatus;
    const updatedVasool = await vasool.save();

    return res.status(200).json({
      message: "Vasool entry updated successfully",
      data: {
        type: status,
        recordedAmount,
        newPending: updatedVasool.pendingAmount,
        vasoolStatus: finalStatus,
        isLastDay,
        note
      },
    });

  } catch (error) {
    console.error("Vasool Payment Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const arrearPayment = async (req, res) => {
  try {
    const { vasoolId } = req.params;
    const { amount } = req.body;

    const paymentStatus = "paid";

    // 1. Validate Input
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        message: "Amount is required and must be positive",
      });
    }

    // 2. Fetch Vasool
    let vasool = await Vasool.findById(vasoolId).populate("userId");
    if (!vasool) return res.status(404).json({ message: "Vasool not found" });

    if (vasool.status !== "arrear") {
      return res.status(400).json({ message: "Vasool is not in arrear status" });
    }

    // 3. Fetch Admin (To update Balance and Commission)
    const admin = await Admin.findOne();

    // 4. Calculate New Pending Amount
    let collectedChange = amount;
    let pendingChange = 0;

    // Logic: Reduce pending by the paid amount
    if (amount >= vasool.pendingAmount) {
      pendingChange = -vasool.pendingAmount; // Clears the debt exactly
    } else {
      pendingChange = -amount;
    }

    // Ensure pending never goes below 0
    const newPending = Math.max(0, vasool.pendingAmount + pendingChange);

    // 5. Update Vasool Payments Array
    const newPayment = {
      amount: amount,
      status: paymentStatus,
      date: new Date(),
    };

    vasool.payments.push(newPayment);
    vasool.collectedAmount += collectedChange;
    vasool.pendingAmount = newPending;

    // 6. Update Admin Balance (Cash Flow - Money received today)
    if (admin) {
      admin.balanceAmount = (admin.balanceAmount || 0) + amount;
      // We will save 'admin' at the end to include potential commission updates
    }

    // 7. Check for Completion & Handle Commission
    let finalStatus = "arrear";
    let note = "Payment accepted";

if (newPending === 0) {
  finalStatus = "completed";
  note = "Arrear cleared - Loan Completed";

  // --- COMMISSION LOGIC START ---

  // 1️⃣ Total Interest = 20% of Loan Amount
  const totalInterestGain = vasool.amount * 0.20;

  let agentShare = 0;
  let adminShare = totalInterestGain;

  // 2️⃣ Agent Commission = % of Loan Amount
  if (vasool.agentId) {
    const agent = await Agent.findById(vasool.agentId);

    if (agent && agent.commissionRate > 0) {
      // commissionRate = 10 → 10% of LOAN amount
      agentShare =
        vasool.amount * (agent.commissionRate / 100);

      // Update Agent Wallet
      agent.amount = (agent.amount || 0) + agentShare;
      await agent.save();

      // Admin gets remaining interest
      adminShare = totalInterestGain - agentShare;
    }
  }

  // 3️⃣ Safety check
  if (adminShare < 0) adminShare = 0;

  // 4️⃣ Update Admin Wallet
  if (admin) {
    admin.currentAmount =
      (admin.currentAmount || 0) + adminShare;
  }

  // --- COMMISSION LOGIC END ---
}


    // 8. Save Updates
    if (admin) {
      await admin.save(); // Saves both balanceAmount and currentAmount (if updated)
    }

    vasool.status = finalStatus;
    const updatedVasool = await vasool.save();

    return res.status(200).json({
      message: "Arrear payment successful",
      data: {
        type: paymentStatus,
        amountRecorded: amount,
        collectedToday: collectedChange,
        newPendingAmount: updatedVasool.pendingAmount,
        vasoolStatus: finalStatus,
        note,
        totalCollected: updatedVasool.collectedAmount,
      },
    });

  } catch (error) {
    console.error("Arrear Payment Error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



// Helper function to extract Public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  // Splits the URL by '/', takes the last segment, and removes the file extension
  const segments = url.split("/");
  const lastSegment = segments.pop();
  return lastSegment.split(".")[0]; 
  // Note: If you use folders in Cloudinary, you might need to include the folder name in the extraction logic.
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params; // Assuming the ID is passed as a URL parameter

    // 1. Find the user first (we need the image URLs before deleting)
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. Prepare Cloudinary Deletion Promises
    const deleteImagesPromises = [];

    // Check if profile image exists and add to deletion queue
    if (user.profile) {
      const profilePublicId = getPublicIdFromUrl(user.profile);
      if (profilePublicId) {
        deleteImagesPromises.push(cloudinary.uploader.destroy(profilePublicId));
      }
    }

    // Check if proof image exists and add to deletion queue
    if (user.proof) {
      const proofPublicId = getPublicIdFromUrl(user.proof);
      if (proofPublicId) {
        deleteImagesPromises.push(cloudinary.uploader.destroy(proofPublicId));
      }
    }

    // Execute Cloudinary deletions (runs in parallel)
    if (deleteImagesPromises.length > 0) {
      await Promise.all(deleteImagesPromises);
    }

    // 3. Delete all related Vasool documents
    // We use deleteMany where the 'userId' matches the user being deleted
    await Vasool.deleteMany({ userId: id });

    // 4. Finally, Delete the User Document
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User, related Vasools, and associated images deleted successfully.",
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error while deleting user",
      error: error.message,
    });
  }
};




export const getWealthProjection = async (req, res) => {
  try {
    const [
      adminData,
      activePendingAgg,
      arrearPendingAgg,
      agentAmountAgg,
      companyWealthAgg
    ] = await Promise.all([
      // 1. Get Admin Current Amount
      Admin.findOne({}, "currentAmount balanceAmount inverstAmount"),

      // 2. Vasool Active Status: Pending Amount Sum
      Vasool.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: null, total: { $sum: "$pendingAmount" } } }
      ]),

      // 3. Arrear Status: Pending Amount Sum
      Vasool.aggregate([
        { $match: { status: "arrear" } },
        { $group: { _id: null, total: { $sum: "$pendingAmount" } } }
      ]),

      // 4. All Agent Amount Sum
      Agent.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),

      // 5. Company Wealth Calculation
      // Logic: Sum of [ (LoanAmount * 0.80) - CollectedAmount ] for all active loans
      Vasool.aggregate([
        { $match: { status: "active" } },
        {
          $project: {
            outstandingPrincipal: {
              $subtract: [
                // { $multiply: ["$amount", 0.8] },
                "$amount", // 80% of Loan Amount
                "$collectedAmount"               // Minus Collected Amount
              ]
            }
          }
        },
        { $group: { _id: null, total: { $sum: "$outstandingPrincipal" } } }
      ])
    ]);

    // Extract values safely (handle empty results)
    const adminCurrentAmount = adminData ? adminData.currentAmount : 0;
    const activePendingSum = activePendingAgg.length > 0 ? activePendingAgg[0].total : 0;
    const arrearPendingSum = arrearPendingAgg.length > 0 ? arrearPendingAgg[0].total : 0;
    const allAgentSum = agentAmountAgg.length > 0 ? agentAmountAgg[0].total : 0;
    const companyWealth = companyWealthAgg.length > 0 ? companyWealthAgg[0].total : 0;
    const adminBalanceAmount = adminData ? adminData.balanceAmount : 0;
    const adminInvestmentAmount = adminData ? adminData.inverstAmount : 0;

    return res.status(200).json({
      success: true,
      data: {
        adminCurrentAmount,    // 1. Admin Current Amount
        activePendingSum,      // 2. Active Pending Sum
        arrearPendingSum,      // 3. Arrear Pending Sum
        allAgentSum,           // 4. All Agent Wallet Sum
        companyWealth: Math.round(companyWealth) // 5. Company Outstanding Principal (Market Money)
        ,adminBalanceAmount,
        adminInvestmentAmount
      }
    });

  } catch (error) {
    console.error("Error fetching wealth projection:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};