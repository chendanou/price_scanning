import { Router } from 'express';
import { uploadFiles } from '../middleware/file-upload';
import { uploadController } from '../controllers/upload.controller';
import { scrapeController, getJobStatus, getResults } from '../controllers/scrape.controller';

const router = Router();

// File upload endpoint
router.post('/upload', uploadFiles, uploadController);

// Scraping endpoints
router.post('/scrape', scrapeController);
router.get('/jobs/:jobId', getJobStatus);
router.get('/results/:jobId', getResults);

router.get('/results/:jobId/csv', (_req, res) => {
  res.json({ message: 'Export CSV - to be implemented' });
});

router.delete('/jobs/:jobId', (_req, res) => {
  res.json({ message: 'Delete job - to be implemented' });
});

export default router;
