import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    onRetry,
  } = options;

  let lastError: Error;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        logger.error(`Max retries (${maxRetries}) reached. Giving up.`);
        throw lastError;
      }

      logger.warn(`Attempt ${attempt}/${maxRetries} failed: ${lastError.message}. Retrying in ${currentDelay}ms...`);

      if (onRetry) {
        onRetry(lastError, attempt);
      }

      await sleep(currentDelay);

      // Exponential backoff
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError!;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Add random jitter to a delay (helps avoid thundering herd)
 */
export function addJitter(delayMs: number, jitterPercent: number = 0.25): number {
  const jitter = delayMs * jitterPercent;
  return delayMs + Math.random() * jitter * 2 - jitter;
}
