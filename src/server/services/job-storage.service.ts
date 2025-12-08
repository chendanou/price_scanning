import { JobData, JobStatus } from '../types';
import { logger } from '../utils/logger';

// In-memory storage for jobs
const jobs = new Map<string, JobData>();

/**
 * Save a job to storage
 */
export function saveJob(jobData: JobData): void {
  jobs.set(jobData.jobId, jobData);
  logger.info(`Job saved: ${jobData.jobId} with ${jobData.stores.length} stores and ${jobData.products.length} products`);
}

/**
 * Get a job by ID
 */
export function getJob(jobId: string): JobData | undefined {
  return jobs.get(jobId);
}

/**
 * Update job status
 */
export function updateJobStatus(jobId: string, status: JobStatus, error?: string): void {
  const job = jobs.get(jobId);
  if (job) {
    job.status = status;
    if (error) {
      job.error = error;
    }
    jobs.set(jobId, job);
    logger.info(`Job ${jobId} status updated to ${status}`);
  }
}

/**
 * Delete a job
 */
export function deleteJob(jobId: string): boolean {
  const deleted = jobs.delete(jobId);
  if (deleted) {
    logger.info(`Job deleted: ${jobId}`);
  }
  return deleted;
}

/**
 * Get all job IDs
 */
export function getAllJobIds(): string[] {
  return Array.from(jobs.keys());
}

/**
 * Clear all jobs (useful for testing)
 */
export function clearAllJobs(): void {
  const count = jobs.size;
  jobs.clear();
  logger.info(`Cleared ${count} jobs from storage`);
}
