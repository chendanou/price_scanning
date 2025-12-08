// Core data structures

export interface StoreData {
  storeName: string;
  websiteUrl: string;
}

export interface ProductData {
  productId: string;
  productName: string;
  description: string;
  brand: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedData {
  stores: StoreData[];
  products: ProductData[];
}

export interface UploadResponse {
  jobId: string;
  stores: number;
  products: number;
  message: string;
}

export interface JobData {
  jobId: string;
  stores: StoreData[];
  products: ProductData[];
  status: JobStatus;
  createdAt: Date;
  results?: ScrapingResult[];
}

export enum JobStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ScrapingResult {
  productId: string;
  productName: string;
  storeName: string;
  foundProductName?: string;
  price?: number;
  currency?: string;
  availability?: string;
  isExactMatch: boolean;
  replacementDescription?: string;
  errorMessage?: string;
}
