import express from 'express';
import { NewAdmin, LoginAdmin, RefreshTokenCon, Getme,updatePassword } from '../controller/AdminController.js';
import { verifyToken } from '../utils/jwt.js';

export const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = verifyToken(token);
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

const router = express.Router();

router.post('/new-admin',NewAdmin);
router.post("/login",LoginAdmin);
router.post("/refresh-token", RefreshTokenCon);
router.get("/me",authenticateAdmin, Getme);
router.put('/update-password', authenticateAdmin, updatePassword);
export default router;