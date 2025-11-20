import express from 'express';
import dbConnect from './db/dbconnect.js';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import AdminRoute from './Routes/AdminRoute.js';
import UserRoute from './Routes/UserRoute.js';
import { v2 as cloudinary } from 'cloudinary';



const app = express();
dotenv.config();
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


app.use('/api/admin', AdminRoute);
app.use('/api/user', UserRoute);

// Friendly JSON parse error response
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Invalid JSON payload:', err.message);
    return res.status(400).json({
      message: 'Invalid JSON payload',
      details: err.message
    });
  }
  next(err);
});


app.get('/test', (req, res) => {
  res.send('Hello, VasoolX! This is a test endpoint.');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  dbConnect();
  console.log(`Server is running on port ${PORT}`);
});