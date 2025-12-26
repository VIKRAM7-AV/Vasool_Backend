import express from 'express';
import multer from 'multer';
import { NewUser, getAllUsers, newAgent , BookingVasool ,allAgent, allVasool,updateAgent,deleteUser,arrearPayment,vasoolPayment, arrearVasool, allVasools, UpdateUser, expectAmount, getWealthProjection } from '../controller/UserController.js';

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
  { name: 'proof1', maxCount: 1 }
]), NewUser);

router.get('/users', getAllUsers);

router.post('/newagent', newAgent);
router.get('/agents', allAgent);
router.put('/agents/:agentId', updateAgent);
router.put('/update-user/:id', upload.fields([{ name: 'profile' }, { name: 'proof1' }]), UpdateUser);
router.post('/newbooking', BookingVasool)
router.get('/allvasool', allVasool)
router.get('/allvasools', allVasools)
router.get('/arrearvasool', arrearVasool)
router.post('/payment/:vasoolId', vasoolPayment)
router.post('/arrearpayment/:vasoolId', arrearPayment)
router.get('/expectamount', expectAmount)
router.delete("/delete/:id", deleteUser);
router.get('/wealth-projection', getWealthProjection);

export default router;