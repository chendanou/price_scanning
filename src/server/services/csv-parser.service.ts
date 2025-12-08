import { parse } from 'csv-parse/sync';
import { StoreData, ProductData, ValidationError } from '../types';
import { logger } from '../utils/logger';

// Required column headers (case-insensitive matching)
const STORE_HEADERS = ['StoreName', 'Website URL'];
const PRODUCT_HEADERS = ['ProductId', 'ProductName', 'Description', 'Brand'];

/**
 * Normalize header names for comparison (case-insensitive, remove spaces)
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/\s+/g, '');
}

/**
 * Check if headers match (case-insensitive, flexible spacing)
 */
function headersMatch(actual: string[], required: string[]): { match: boolean; missing: string[] } {
  const normalizedActual = actual.map(normalizeHeader);
  const missing: string[] = [];

  for (const requiredHeader of required) {
    const normalized = normalizeHeader(requiredHeader);
    if (!normalizedActual.includes(normalized)) {
      missing.push(requiredHeader);
    }
  }

  return { match: missing.length === 0, missing };
}

/**
 * Find actual header name that matches required header (case-insensitive)
 */
function findMatchingHeader(actualHeaders: string[], requiredHeader: string): string | undefined {
  const normalized = normalizeHeader(requiredHeader);
  return actualHeaders.find(h => normalizeHeader(h) === normalized);
}

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
      bom: true, // Handle BOM (Byte Order Mark) in UTF-8 files
    });

    // Validate headers
    if (records.length > 0) {
      const headers = Object.keys(records[0]);
      const headerCheck = headersMatch(headers, STORE_HEADERS);

      if (!headerCheck.match) {
        errors.push({
          row: 0,
          field: 'headers',
          message: `Missing required columns: ${headerCheck.missing.join(', ')}. Found: ${headers.join(', ')}`,
        });
        return { data: [], errors };
      }
    }

    // Find actual header names (case-insensitive)
    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    const storeNameHeader = findMatchingHeader(headers, 'StoreName');
    const websiteUrlHeader = findMatchingHeader(headers, 'Website URL');

    // Parse and validate each row
    records.forEach((record: any, index: number) => {
      const rowNum = index + 2; // +2 because index is 0-based and header is row 1

      const storeName = storeNameHeader ? record[storeNameHeader] : '';
      const websiteUrl = websiteUrlHeader ? record[websiteUrlHeader] : '';

      // Validate StoreName
      if (!storeName || storeName.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'StoreName',
          message: 'StoreName is required',
        });
      }

      // Validate Website URL
      if (!websiteUrl || websiteUrl.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'Website URL',
          message: 'Website URL is required',
        });
      } else if (!isValidUrl(websiteUrl)) {
        errors.push({
          row: rowNum,
          field: 'Website URL',
          message: 'Website URL must be a valid URL (including http:// or https://)',
        });
      }

      // Add valid store data
      if (storeName && websiteUrl && isValidUrl(websiteUrl)) {
        data.push({
          storeName: storeName.trim(),
          websiteUrl: websiteUrl.trim(),
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
      bom: true, // Handle BOM (Byte Order Mark) in UTF-8 files
    });

    // Validate headers
    if (records.length > 0) {
      const headers = Object.keys(records[0]);
      const headerCheck = headersMatch(headers, PRODUCT_HEADERS);

      if (!headerCheck.match) {
        errors.push({
          row: 0,
          field: 'headers',
          message: `Missing required columns: ${headerCheck.missing.join(', ')}. Found: ${headers.join(', ')}`,
        });
        return { data: [], errors };
      }
    }

    // Find actual header names (case-insensitive)
    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    const productIdHeader = findMatchingHeader(headers, 'ProductId');
    const productNameHeader = findMatchingHeader(headers, 'ProductName');
    const descriptionHeader = findMatchingHeader(headers, 'Description');
    const brandHeader = findMatchingHeader(headers, 'Brand');

    // Parse and validate each row
    records.forEach((record: any, index: number) => {
      const rowNum = index + 2; // +2 because index is 0-based and header is row 1

      const productId = productIdHeader ? record[productIdHeader] : '';
      const productName = productNameHeader ? record[productNameHeader] : '';
      const description = descriptionHeader ? record[descriptionHeader] : '';
      const brand = brandHeader ? record[brandHeader] : '';

      // Validate ProductId
      if (!productId || productId.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'ProductId',
          message: 'ProductId is required',
        });
      }

      // Validate ProductName
      if (!productName || productName.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'ProductName',
          message: 'ProductName is required',
        });
      }

      // Validate Description
      if (!description || description.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'Description',
          message: 'Description is required',
        });
      }

      // Validate Brand
      if (!brand || brand.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'Brand',
          message: 'Brand is required',
        });
      }

      // Add valid product data
      if (productId && productName && description && brand) {
        data.push({
          productId: productId.trim(),
          productName: productName.trim(),
          description: description.trim(),
          brand: brand.trim(),
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
