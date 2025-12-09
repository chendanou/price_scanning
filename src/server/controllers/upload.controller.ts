import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { parseStoresCSV, parseProductsCSV } from '../services/csv-parser.service';
import { saveJob } from '../services/job-storage.service';
import { JobStatus, UploadResponse } from '../types';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { indexProducts } from '../services/ai-search.service';

/**
 * Handle file upload
 */
export async function uploadController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if files exist
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (!files || !files.storesFile || !files.productsFile) {
      throw new AppError(400, 'Both storesFile and productsFile are required');
    }

    const storesFile = files.storesFile[0];
    const productsFile = files.productsFile[0];

    logger.info(`Received upload request: ${storesFile.originalname}, ${productsFile.originalname}`);

    // Parse CSV files
    const storesResult = await parseStoresCSV(storesFile.buffer);
    const productsResult = await parseProductsCSV(productsFile.buffer);

    // Check for parsing errors
    const allErrors = [...storesResult.errors, ...productsResult.errors];

    if (allErrors.length > 0) {
      logger.warn(`CSV validation errors: ${allErrors.length} errors found`);
      res.status(400).json({
        status: 'error',
        message: 'CSV validation failed',
        errors: allErrors,
      });
      return;
    }

    // Check if we have any data
    if (storesResult.data.length === 0) {
      throw new AppError(400, 'No valid stores found in CSV file');
    }

    if (productsResult.data.length === 0) {
      throw new AppError(400, 'No valid products found in CSV file');
    }

    // Generate job ID
    const jobId = randomUUID();

    // Save job data
    saveJob({
      jobId,
      stores: storesResult.data,
      products: productsResult.data,
      status: JobStatus.UPLOADED,
      createdAt: new Date(),
    });

    // Index products in Azure AI Search (async, don't wait)
    indexProducts(productsResult.data).catch((error) => {
      logger.error(`Failed to index products for job ${jobId}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    // Return success response
    const response: UploadResponse = {
      jobId,
      stores: storesResult.data.length,
      products: productsResult.data.length,
      message: 'Files uploaded and validated successfully',
    };

    logger.info(`Upload successful: Job ${jobId} with ${response.stores} stores and ${response.products} products`);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}
