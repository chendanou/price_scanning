import {
  SearchClient,
  SearchIndexClient,
  AzureKeyCredential,
  SearchIndex,
} from '@azure/search-documents';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ProductData } from '../types';
import { generateEmbedding } from './openai.service';

interface ProductDocument extends ProductData {
  id: string; // Azure Search requires 'id' field
  embedding?: number[];
  searchText: string; // Combined text for full-text search
}

let searchClient: SearchClient<ProductDocument> | null = null;
let indexClient: SearchIndexClient | null = null;

/**
 * Get Azure AI Search client
 */
export function getSearchClient(): SearchClient<ProductDocument> {
  if (!searchClient) {
    if (!config.azure.search.endpoint || !config.azure.search.key) {
      throw new Error('Azure Search credentials not configured');
    }

    searchClient = new SearchClient<ProductDocument>(
      config.azure.search.endpoint,
      config.azure.search.indexName,
      new AzureKeyCredential(config.azure.search.key)
    );

    logger.info('Azure Search client initialized', {
      indexName: config.azure.search.indexName,
    });
  }

  return searchClient;
}

/**
 * Get Azure Search Index client
 */
function getIndexClient(): SearchIndexClient {
  if (!indexClient) {
    if (!config.azure.search.endpoint || !config.azure.search.key) {
      throw new Error('Azure Search credentials not configured');
    }

    indexClient = new SearchIndexClient(
      config.azure.search.endpoint,
      new AzureKeyCredential(config.azure.search.key)
    );

    logger.info('Azure Search Index client initialized');
  }

  return indexClient;
}

/**
 * Create or update the search index
 */
export async function createOrUpdateIndex(): Promise<void> {
  const client = getIndexClient();

  const index: SearchIndex = {
    name: config.azure.search.indexName,
    fields: [
      {
        name: 'id',
        type: 'Edm.String',
        key: true,
        filterable: true,
      },
      {
        name: 'productId',
        type: 'Edm.String',
        filterable: true,
        sortable: true,
      },
      {
        name: 'productName',
        type: 'Edm.String',
        searchable: true,
        filterable: true,
      },
      {
        name: 'description',
        type: 'Edm.String',
        searchable: true,
      },
      {
        name: 'brand',
        type: 'Edm.String',
        searchable: true,
        filterable: true,
        facetable: true,
      },
      {
        name: 'searchText',
        type: 'Edm.String',
        searchable: true,
      },
      {
        name: 'embedding',
        type: 'Collection(Edm.Single)',
        searchable: true,
        vectorSearchDimensions: 1536, // text-embedding-ada-002 dimensions
        vectorSearchProfileName: 'default-vector-profile',
      },
    ],
    vectorSearch: {
      profiles: [
        {
          name: 'default-vector-profile',
          algorithmConfigurationName: 'default-algorithm',
        },
      ],
      algorithms: [
        {
          name: 'default-algorithm',
          kind: 'hnsw', // Hierarchical Navigable Small World algorithm
        },
      ],
    },
  };

  try {
    await client.createOrUpdateIndex(index);
    logger.info('Search index created/updated successfully', {
      indexName: config.azure.search.indexName,
    });
  } catch (error) {
    logger.error('Failed to create/update search index', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Index products with embeddings
 */
export async function indexProducts(products: ProductData[]): Promise<void> {
  const client = getSearchClient();

  logger.info(`Indexing ${products.length} products...`);

  const documents: ProductDocument[] = [];

  for (const product of products) {
    try {
      // Generate search text combining all searchable fields
      const searchText = `${product.productName} ${product.brand} ${product.description}`;

      // Generate embedding for semantic search
      const embedding = await generateEmbedding(searchText);

      const doc: ProductDocument = {
        id: product.productId, // Use productId as the document ID
        productId: product.productId,
        productName: product.productName,
        description: product.description,
        brand: product.brand,
        searchText,
        embedding,
      };

      documents.push(doc);

      logger.debug('Generated embedding for product', {
        productId: product.productId,
        embeddingDimensions: embedding.length,
      });
    } catch (error) {
      logger.error('Failed to generate embedding for product', {
        productId: product.productId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue with other products
    }
  }

  if (documents.length === 0) {
    logger.warn('No products to index');
    return;
  }

  try {
    const result = await client.uploadDocuments(documents);

    const succeeded = result.results.filter((r) => r.succeeded).length;
    const failed = result.results.filter((r) => !r.succeeded).length;

    logger.info('Products indexed', {
      total: documents.length,
      succeeded,
      failed,
    });

    if (failed > 0) {
      const errors = result.results
        .filter((r) => !r.succeeded)
        .map((r) => ({ key: r.key, error: r.errorMessage }));
      logger.warn('Some products failed to index', { errors });
    }
  } catch (error) {
    logger.error('Failed to upload documents to search index', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Search for products using semantic search
 */
export async function searchProducts(
  query: string,
  options: {
    brand?: string;
    top?: number;
  } = {}
): Promise<Array<ProductData & { score: number }>> {
  const client = getSearchClient();
  const { brand, top = 5 } = options;

  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    logger.debug('Searching products', { query, brand, top });

    const searchResults = await client.search(query, {
      vectorSearchOptions: {
        queries: [
          {
            kind: 'vector',
            vector: queryEmbedding,
            kNearestNeighborsCount: top * 2, // Get more candidates for filtering
            fields: ['embedding'],
          },
        ],
      },
      filter: brand ? `brand eq '${brand}'` : undefined,
      top,
      select: ['productId', 'productName', 'description', 'brand'],
    });

    const results: Array<ProductData & { score: number }> = [];

    for await (const result of searchResults.results) {
      if (result.document) {
        results.push({
          productId: result.document.productId,
          productName: result.document.productName,
          description: result.document.description,
          brand: result.document.brand,
          score: result.score || 0,
        });
      }
    }

    logger.debug('Search completed', {
      query,
      resultsCount: results.length,
    });

    return results;
  } catch (error) {
    logger.error('Product search failed', {
      query,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Find best matching product for a scraped result
 */
export async function findBestMatch(
  scrapedProductName: string,
  brand?: string
): Promise<(ProductData & { score: number; isExactMatch: boolean }) | null> {
  const results = await searchProducts(scrapedProductName, { brand, top: 1 });

  if (results.length === 0) {
    return null;
  }

  const bestMatch = results[0];

  // Determine if it's an exact match based on score threshold
  const isExactMatch = bestMatch.score > 0.85; // Adjust threshold as needed

  logger.debug('Best match found', {
    scrapedProductName,
    matchedProduct: bestMatch.productName,
    score: bestMatch.score,
    isExactMatch,
  });

  return {
    ...bestMatch,
    isExactMatch,
  };
}

/**
 * Clear all documents from the index
 */
export async function clearIndex(): Promise<void> {
  const client = getSearchClient();

  try {
    // Get all document keys
    const searchResults = await client.search('*', {
      select: ['id'],
      top: 1000,
    });

    const keysToDelete: string[] = [];
    for await (const result of searchResults.results) {
      if (result.document?.id) {
        keysToDelete.push(result.document.id);
      }
    }

    if (keysToDelete.length === 0) {
      logger.info('Index is already empty');
      return;
    }

    await client.deleteDocuments('id', keysToDelete);

    logger.info('Index cleared', { deletedCount: keysToDelete.length });
  } catch (error) {
    logger.error('Failed to clear index', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
