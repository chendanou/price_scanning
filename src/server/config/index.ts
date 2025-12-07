import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.number().default(3000),
  host: z.string().default('localhost'),

  azure: z.object({
    search: z.object({
      endpoint: z.string().url().optional(),
      key: z.string().optional(),
      indexName: z.string().default('products'),
    }),
    openai: z.object({
      endpoint: z.string().url().optional(),
      key: z.string().optional(),
      deploymentName: z.string().default('gpt-4'),
      embeddingDeployment: z.string().default('text-embedding-ada-002'),
    }),
    storage: z.object({
      connectionString: z.string().optional(),
      uploadsContainer: z.string().default('uploads'),
      resultsContainer: z.string().default('results'),
    }),
  }),

  scraping: z.object({
    maxConcurrentBrowsers: z.number().default(2),
    delayBetweenStoresMs: z.number().default(5000),
    delayBetweenProductsMs: z.number().default(2000),
    scrapeTimeoutMs: z.number().default(30000),
    maxRetries: z.number().default(3),
  }),

  rateLimit: z.object({
    windowMs: z.number().default(900000),
    maxRequests: z.number().default(100),
  }),

  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    file: z.string().default('logs/app.log'),
  }),
});

export const config = configSchema.parse({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',

  azure: {
    search: {
      endpoint: process.env.AZURE_SEARCH_ENDPOINT,
      key: process.env.AZURE_SEARCH_KEY,
      indexName: process.env.AZURE_SEARCH_INDEX_NAME || 'products',
    },
    openai: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      key: process.env.AZURE_OPENAI_KEY,
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4',
      embeddingDeployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002',
    },
    storage: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      uploadsContainer: process.env.AZURE_STORAGE_CONTAINER_UPLOADS || 'uploads',
      resultsContainer: process.env.AZURE_STORAGE_CONTAINER_RESULTS || 'results',
    },
  },

  scraping: {
    maxConcurrentBrowsers: parseInt(process.env.MAX_CONCURRENT_BROWSERS || '2', 10),
    delayBetweenStoresMs: parseInt(process.env.DELAY_BETWEEN_STORES_MS || '5000', 10),
    delayBetweenProductsMs: parseInt(process.env.DELAY_BETWEEN_PRODUCTS_MS || '2000', 10),
    scrapeTimeoutMs: parseInt(process.env.SCRAPE_TIMEOUT_MS || '30000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  logging: {
    level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
});

export type Config = z.infer<typeof configSchema>;
