import { parse } from 'csv-parse/sync';
import { StoreData, ProductData, ValidationError } from '../types';
import { logger } from '../utils/logger';

// Required column headers
const STORE_HEADERS = ['StoreName', 'Website URL'];
const PRODUCT_HEADERS = ['ProductId', 'ProductName', 'Description', 'Brand'];

/**
 * Parse stores CSV file
 */
export async function parseStoresCSV(
  fileBuffer: Buffer
): Promise<{ data: StoreData[]; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];
  const data: StoreData[] = [];

  try {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Validate headers
    if (records.length > 0) {
      const headers = Object.keys(records[0]);
      const missingHeaders = STORE_HEADERS.filter((h) => !headers.includes(h));

      if (missingHeaders.length > 0) {
        errors.push({
          row: 0,
          field: 'headers',
          message: `Missing required columns: ${missingHeaders.join(', ')}`,
        });
        return { data: [], errors };
      }
    }

    // Parse and validate each row
    records.forEach((record: any, index: number) => {
      const rowNum = index + 2; // +2 because index is 0-based and header is row 1

      // Validate StoreName
      if (!record.StoreName || record.StoreName.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'StoreName',
          message: 'StoreName is required',
        });
      }

      // Validate Website URL
      if (!record['Website URL'] || record['Website URL'].trim() === '') {
        errors.push({
          row: rowNum,
          field: 'Website URL',
          message: 'Website URL is required',
        });
      } else if (!isValidUrl(record['Website URL'])) {
        errors.push({
          row: rowNum,
          field: 'Website URL',
          message: 'Website URL must be a valid URL (including http:// or https://)',
        });
      }

      // Add valid store data
      if (record.StoreName && record['Website URL'] && isValidUrl(record['Website URL'])) {
        data.push({
          storeName: record.StoreName.trim(),
          websiteUrl: record['Website URL'].trim(),
        });
      }
    });

    logger.info(`Parsed stores CSV: ${data.length} valid stores, ${errors.length} errors`);
    return { data, errors };
  } catch (error) {
    logger.error('Error parsing stores CSV:', error);
    errors.push({
      row: 0,
      field: 'file',
      message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    return { data: [], errors };
  }
}

/**
 * Parse products CSV file
 */
export async function parseProductsCSV(
  fileBuffer: Buffer
): Promise<{ data: ProductData[]; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];
  const data: ProductData[] = [];

  try {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Validate headers
    if (records.length > 0) {
      const headers = Object.keys(records[0]);
      const missingHeaders = PRODUCT_HEADERS.filter((h) => !headers.includes(h));

      if (missingHeaders.length > 0) {
        errors.push({
          row: 0,
          field: 'headers',
          message: `Missing required columns: ${missingHeaders.join(', ')}`,
        });
        return { data: [], errors };
      }
    }

    // Parse and validate each row
    records.forEach((record: any, index: number) => {
      const rowNum = index + 2; // +2 because index is 0-based and header is row 1

      // Validate ProductId
      if (!record.ProductId || record.ProductId.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'ProductId',
          message: 'ProductId is required',
        });
      }

      // Validate ProductName
      if (!record.ProductName || record.ProductName.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'ProductName',
          message: 'ProductName is required',
        });
      }

      // Validate Description
      if (!record.Description || record.Description.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'Description',
          message: 'Description is required',
        });
      }

      // Validate Brand
      if (!record.Brand || record.Brand.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'Brand',
          message: 'Brand is required',
        });
      }

      // Add valid product data
      if (
        record.ProductId &&
        record.ProductName &&
        record.Description &&
        record.Brand
      ) {
        data.push({
          productId: record.ProductId.trim(),
          productName: record.ProductName.trim(),
          description: record.Description.trim(),
          brand: record.Brand.trim(),
        });
      }
    });

    logger.info(`Parsed products CSV: ${data.length} valid products, ${errors.length} errors`);
    return { data, errors };
  } catch (error) {
    logger.error('Error parsing products CSV:', error);
    errors.push({
      row: 0,
      field: 'file',
      message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    return { data: [], errors };
  }
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
