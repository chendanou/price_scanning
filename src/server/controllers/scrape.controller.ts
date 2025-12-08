import { Request, Response, NextFunction } from 'express';
import { getJob } from '../services/job-storage.service';
import { startScraping } from '../services/scraper.service';
import { JobStatus } from '../types';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

/**
 * Start scraping for a job
 */
export async function scrapeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      throw new AppError(400, 'jobId is required');
    }

    // Check if job exists
    const job = getJob(jobId);
    if (!job) {
      throw new AppError(404, `Job ${jobId} not found`);
    }

    // Check if job is already processing
    if (job.status === JobStatus.PROCESSING) {
      throw new AppError(400, `Job ${jobId} is already being processed`);
    }

    if (job.status === JobStatus.COMPLETED) {
      throw new AppError(400, `Job ${jobId} has already been completed`);
    }

    logger.info(`Starting scrape for job: ${jobId}`);

    // Start scraping in background (don't wait for it to complete)
    startScraping(jobId).catch((error) => {
      logger.error(`Scraping job ${jobId} failed: ${error.message}`);
    });

    // Return immediately
    res.status(202).json({
      status: 'accepted',
      message: 'Scraping started',
      jobId,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get job status and progress
 */
export async function getJobStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { jobId } = req.params;

    const job = getJob(jobId);
    if (!job) {
      throw new AppError(404, `Job ${jobId} not found`);
    }

    res.status(200).json({
      jobId: job.jobId,
      status: job.status,
      createdAt: job.createdAt,
      stores: job.stores.length,
      products: job.products.length,
      resultsCount: job.results?.length || 0,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get scraping results
 */
export async function getResults(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { jobId } = req.params;

    const job = getJob(jobId);
    if (!job) {
      throw new AppError(404, `Job ${jobId} not found`);
    }

    if (job.status !== JobStatus.COMPLETED) {
      throw new AppError(400, `Job ${jobId} is not yet completed (status: ${job.status})`);
    }

    res.status(200).json({
      jobId: job.jobId,
      status: job.status,
      results: job.results || [],
    });
  } catch (error) {
    next(error);
  }
}
