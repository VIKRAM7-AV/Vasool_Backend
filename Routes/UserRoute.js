import express from 'express';
import multer from 'multer';
import { NewUser, getAllUsers, newAgent , BookingVasool ,allAgent, allVasool,arrearPayment,vasoolPayment, arrearVasool } from '../controller/UserController.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Handle multiple file uploads with specific field names
router.post('/newuser', upload.fields([
  { name: 'profile', maxCount: 1 },
  { name: 'proof1', maxCount: 1 },
  { name: 'proof2', maxCount: 1 }
]), NewUser);

router.get('/users', getAllUsers);

router.post('/newagent', newAgent);
router.get('/agents', allAgent);

router.post('/newbooking', BookingVasool)
router.get('/allvasool', allVasool)
router.get('/arrearvasool', arrearVasool)
router.post('/payment/:vasoolId', vasoolPayment)
router.post('/arrearpayment/:vasoolId', arrearPayment)
  

export default router;