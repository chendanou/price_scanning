import { Router } from 'express';
import { uploadFiles } from '../middleware/file-upload';
import { uploadController } from '../controllers/upload.controller';

const router = Router();

// File upload endpoint
router.post('/upload', uploadFiles, uploadController);

router.post('/scrape', (_req, res) => {
  res.json({ message: 'Scrape endpoint - to be implemented' });
});

router.get('/jobs/:jobId', (_req, res) => {
  res.json({ message: 'Get job status - to be implemented' });
});

router.get('/results/:jobId', (_req, res) => {
  res.json({ message: 'Get results - to be implemented' });
});

router.get('/results/:jobId/csv', (_req, res) => {
  res.json({ message: 'Export CSV - to be implemented' });
});

router.delete('/jobs/:jobId', (_req, res) => {
  res.json({ message: 'Delete job - to be implemented' });
});

export default router;
