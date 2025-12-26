import Admin from "../Models/AdminModel.js";
import bcrypt from "bcryptjs";
import { signAccessToken, signRefreshToken, verifyToken } from "../utils/jwt.js";

export const NewAdmin = async (req, res) => {
  try {
    // defensive: avoid destructuring from undefined req.body
    const { username, email, password } = req.body || {};

    // validate request body
    const missing = [];
    if (!username) missing.push("username");
    if (!email) missing.push("email");
    if (!password) missing.push("password");
    if (missing.length) {
      return res
        .status(400)
        .json({ message: `Missing required field(s): ${missing.join(", ")}` });
    }

    // Check if admin with the same email or username already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { username }],
    });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin with this email or username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newAdmin = new Admin({ username, email, password: hashedPassword });
    await newAdmin.save();
    res
      .status(201)
      .json({ message: "New admin created successfully", data: newAdmin });
  } catch (error) {
    console.error("Error creating new admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const LoginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingAdmin = await Admin.findOne({ username });
    if (!existingAdmin) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingAdmin.password
    );
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const admin = existingAdmin;

    // Generate tokens
    const accessTokenAdmin = signAccessToken(admin._id);
    const refreshTokenAdmin = signRefreshToken(admin._id);
    res.status(200).json({
      success: true,
      message: "Login successful",
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
      },
      accessTokenAdmin,
      refreshTokenAdmin,
    });
  } catch (error) {
    console.error("Error logging in admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const RefreshTokenCon = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    const accessToken = signAccessToken(admin._id);
    res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const Getme = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired tokend" });
    }
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.status(200).json({ admin });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const updatePassword = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const { currentPassword, newPassword } = req.body || {};

    // Validate request body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: "Both currentPassword and newPassword are required" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: "New password must be at least 6 characters long" 
      });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    admin.password = hashedPassword;
    await admin.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}; 


