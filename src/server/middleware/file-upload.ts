import multer from 'multer';
import { Request } from 'express';
import { AppError } from './error-handler';

// Configure storage (use memory storage for CSV processing)
const storage = multer.memoryStorage();

// File filter to accept only CSV files
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new AppError(400, 'Only CSV files are allowed'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
});

// Export upload middleware for two files
export const uploadFiles = upload.fields([
  { name: 'storesFile', maxCount: 1 },
  { name: 'productsFile', maxCount: 1 },
]);
