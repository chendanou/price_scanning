import { io } from '../index';
import { getJob, updateJobStatus } from './job-storage.service';
import { JobStatus, ScrapingResult, StoreData, ProductData } from '../types';
import { logger } from '../utils/logger';

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Add random jitter to delays (for realistic timing)
 */
function addJitter(delayMs: number): number {
  const jitter = Math.random() * 500; // 0-500ms random jitter
  return delayMs + jitter;
}

/**
 * Start scraping job (MOCK IMPLEMENTATION)
 *
 * NOTE: This is a mock implementation that returns placeholder data.
 * Browser automation with Playwright requires system dependencies not available on Azure App Service.
 * Real scraping will be implemented in Phase 5 using one of these approaches:
 * - Azure Container Apps with Docker (Playwright pre-installed)
 * - Azure Functions with Puppeteer
 * - External scraping service
 */
export async function startScraping(jobId: string): Promise<void> {
  const job = getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  logger.info(`Starting MOCK scraping job: ${jobId} (placeholder data only)`);
  updateJobStatus(jobId, JobStatus.PROCESSING);

  // Emit initial progress
  emitProgress(jobId, {
    status: 'processing',
    progress: 0,
    message: 'Initializing scraper (mock mode)...',
  });

  const results: ScrapingResult[] = [];

  try {
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

        // Generate mock result
        const result = generateMockResult(store, product);
        results.push(result);

        completedTasks++;

        // Emit progress update
        emitProgress(jobId, {
          status: 'processing',
          progress: Math.round((completedTasks / totalTasks) * 100),
          message: `Scraped ${product.productName} from ${store.storeName}`,
          currentStore: store.storeName,
          currentProduct: product.productName,
        });

        // Simulate realistic delay between products
        if (productIndex < job.products.length - 1) {
          await sleep(addJitter(500)); // Much faster than real scraping
        }
      }

      // Simulate realistic delay between stores
      if (storeIndex < job.stores.length - 1) {
        await sleep(addJitter(1000));
      }
    }

    // Update job with results
    job.results = results;
    updateJobStatus(jobId, JobStatus.COMPLETED);

    emitProgress(jobId, {
      status: 'completed',
      progress: 100,
      message: `Completed! Generated ${results.length} mock results from ${totalStores} stores.`,
      results,
    });

    logger.info(`Mock scraping job ${jobId} completed successfully. Total results: ${results.length}`);
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
  }
}

/**
 * Generate mock scraping result with realistic placeholder data
 */
function generateMockResult(store: StoreData, product: ProductData): ScrapingResult {
  // Vary results to make it more realistic
  const scenarios = [
    // 70% - Found with price
    {
      weight: 0.7,
      result: {
        foundProductName: `${product.productName} - ${product.brand}`,
        price: 9.99 + Math.random() * 50, // $9.99 - $59.99
        currency: 'NZD',
        availability: Math.random() > 0.2 ? 'In Stock' : 'Low Stock',
        isExactMatch: Math.random() > 0.3,
        replacementDescription: undefined,
      },
    },
    // 20% - Found but different variant
    {
      weight: 0.2,
      result: {
        foundProductName: `${product.productName} (Alternative Size)`,
        price: 9.99 + Math.random() * 50,
        currency: 'NZD',
        availability: 'In Stock',
        isExactMatch: false,
        replacementDescription: 'Similar product found - size or variant may differ',
      },
    },
    // 10% - Not found
    {
      weight: 0.1,
      result: {
        foundProductName: undefined,
        price: undefined,
        currency: 'NZD',
        availability: 'Out of Stock',
        isExactMatch: false,
        replacementDescription: 'Product not available at this store',
      },
    },
  ];

  // Weighted random selection
  const rand = Math.random();
  let cumulative = 0;
  let selectedScenario = scenarios[0].result;

  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (rand <= cumulative) {
      selectedScenario = scenario.result;
      break;
    }
  }

  return {
    productId: product.productId,
    productName: product.productName,
    brand: product.brand,
    storeName: store.storeName,
    ...selectedScenario,
  };
}

/**
 * Emit progress update via WebSocket
 */
function emitProgress(jobId: string, data: any): void {
  io.emit(`job:${jobId}:progress`, data);
  logger.debug(`Emitted progress for job ${jobId}:`, data);
}
