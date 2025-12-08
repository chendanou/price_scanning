import { io } from '../index';
import { getJob, updateJobStatus } from './job-storage.service';
import { JobStatus, ScrapingResult, StoreData, ProductData } from '../types';
import * as browserService from './browser.service';
import { retry, sleep, addJitter } from '../utils/retry';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Start scraping job
 */
export async function startScraping(jobId: string): Promise<void> {
  const job = getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  logger.info(`Starting scraping job: ${jobId}`);
  updateJobStatus(jobId, JobStatus.PROCESSING);

  // Emit initial progress
  emitProgress(jobId, {
    status: 'processing',
    progress: 0,
    message: 'Initializing browser...',
  });

  const results: ScrapingResult[] = [];
  let browser;
  let context;

  try {
    // Launch browser
    browser = await browserService.launchBrowser();
    context = await browserService.createContext(browser);

    const totalStores = job.stores.length;
    const totalProducts = job.products.length;
    const totalTasks = totalStores * totalProducts;
    let completedTasks = 0;

    // Process each store
    for (let storeIndex = 0; storeIndex < job.stores.length; storeIndex++) {
      const store = job.stores[storeIndex];

      logger.info(`Processing store ${storeIndex + 1}/${totalStores}: ${store.storeName}`);

      emitProgress(jobId, {
        status: 'processing',
        progress: Math.round((completedTasks / totalTasks) * 100),
        message: `Scraping ${store.storeName}...`,
        currentStore: store.storeName,
      });

      // Process each product for this store
      for (let productIndex = 0; productIndex < job.products.length; productIndex++) {
        const product = job.products[productIndex];

        logger.info(`  Product ${productIndex + 1}/${totalProducts}: ${product.productName}`);

        try {
          // Scrape product with retry logic
          const result = await retry(
            () => scrapeProduct(context!, store, product),
            {
              maxRetries: config.scraping.maxRetries,
              delayMs: 2000,
              onRetry: (error, attempt) => {
                logger.warn(`  Retry attempt ${attempt} for ${product.productName}: ${error.message}`);
              },
            }
          );

          results.push(result);

          // Rate limiting between products (anti-bot measure)
          if (productIndex < job.products.length - 1) {
            const delay = addJitter(config.scraping.delayBetweenProductsMs);
            logger.info(`  Waiting ${Math.round(delay)}ms before next product...`);
            await sleep(delay);
          }
        } catch (error) {
          logger.error(`  Failed to scrape ${product.productName}: ${error instanceof Error ? error.message : 'Unknown error'}`);

          // Add error result
          results.push({
            productId: product.productId,
            productName: product.productName,
            brand: product.brand,
            storeName: store.storeName,
            isExactMatch: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        completedTasks++;

        // Emit progress update
        emitProgress(jobId, {
          status: 'processing',
          progress: Math.round((completedTasks / totalTasks) * 100),
          message: `Scraped ${product.productName} from ${store.storeName}`,
          currentStore: store.storeName,
          currentProduct: product.productName,
        });
      }

      // Rate limiting between stores (anti-bot measure)
      if (storeIndex < job.stores.length - 1) {
        const delay = addJitter(config.scraping.delayBetweenStoresMs);
        logger.info(`Waiting ${Math.round(delay)}ms before next store...`);
        await sleep(delay);
      }
    }

    // Update job with results
    job.results = results;
    updateJobStatus(jobId, JobStatus.COMPLETED);

    emitProgress(jobId, {
      status: 'completed',
      progress: 100,
      message: `Completed! Scraped ${results.length} products from ${totalStores} stores.`,
      results,
    });

    logger.info(`Scraping job ${jobId} completed successfully. Total results: ${results.length}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    logger.error(`Scraping job ${jobId} failed: ${errorMessage}`, { stack: errorStack });
    updateJobStatus(jobId, JobStatus.FAILED, errorMessage);

    emitProgress(jobId, {
      status: 'failed',
      progress: 0,
      message: `Job failed: ${errorMessage}`,
      error: errorMessage,
    });

    throw error;
  } finally {
    // Cleanup
    if (context) {
      await browserService.closeContext(context);
    }
    if (browser) {
      await browserService.closeBrowser();
    }
  }
}

/**
 * Scrape a single product from a store
 * This is a basic implementation - will be enhanced with AI in Phase 5
 */
async function scrapeProduct(
  context: any,
  store: StoreData,
  product: ProductData
): Promise<ScrapingResult> {
  const page = await browserService.createPage(context);

  try {
    // Navigate to store website
    await browserService.navigateToUrl(page, store.websiteUrl);

    // Basic implementation: Just visit the site and return placeholder
    // In Phase 5, we'll add:
    // - AI-powered search box detection
    // - Product search functionality
    // - Price extraction with AI
    // - Semantic product matching

    logger.info(`    Visited ${store.websiteUrl}`);

    // For now, return a placeholder result
    return {
      productId: product.productId,
      productName: product.productName,
      brand: product.brand,
      storeName: store.storeName,
      foundProductName: `${product.productName} (placeholder)`,
      price: 9.99 + Math.random() * 10, // Placeholder price
      currency: 'NZD',
      availability: 'In Stock',
      isExactMatch: false,
      replacementDescription: 'This is a placeholder result. AI integration coming in Phase 5.',
    };
  } finally {
    await page.close();
  }
}

/**
 * Emit progress update via WebSocket
 */
function emitProgress(jobId: string, data: any): void {
  io.emit(`job:${jobId}:progress`, data);
  logger.debug(`Emitted progress for job ${jobId}:`, data);
}
