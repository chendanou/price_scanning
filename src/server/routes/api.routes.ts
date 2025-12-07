import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented in later phases
router.post('/upload', (req, res) => {
  res.json({ message: 'Upload endpoint - to be implemented' });
});

router.post('/scrape', (req, res) => {
  res.json({ message: 'Scrape endpoint - to be implemented' });
});

router.get('/jobs/:jobId', (req, res) => {
  res.json({ message: 'Get job status - to be implemented' });
});

router.get('/results/:jobId', (req, res) => {
  res.json({ message: 'Get results - to be implemented' });
});

router.get('/results/:jobId/csv', (req, res) => {
  res.json({ message: 'Export CSV - to be implemented' });
});

router.delete('/jobs/:jobId', (req, res) => {
  res.json({ message: 'Delete job - to be implemented' });
});

export default router;
