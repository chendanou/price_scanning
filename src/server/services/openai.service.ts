import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { config } from '../config';
import { logger } from '../utils/logger';

let openaiClient: OpenAIClient | null = null;

/**
 * Initialize Azure OpenAI client
 */
export function getOpenAIClient(): OpenAIClient {
  if (!openaiClient) {
    if (!config.azure.openai.endpoint || !config.azure.openai.key) {
      throw new Error('Azure OpenAI credentials not configured');
    }

    openaiClient = new OpenAIClient(
      config.azure.openai.endpoint,
      new AzureKeyCredential(config.azure.openai.key)
    );

    logger.info('Azure OpenAI client initialized');
  }

  return openaiClient;
}

/**
 * Generate text completion using GPT-4
 */
export async function generateCompletion(
  prompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    systemMessage?: string;
  } = {}
): Promise<string> {
  const client = getOpenAIClient();
  const { maxTokens = 1000, temperature = 0.7, systemMessage } = options;

  try {
    const messages: any[] = [];

    if (systemMessage) {
      messages.push({
        role: 'system',
        content: systemMessage,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    logger.debug('Sending completion request to Azure OpenAI', {
      deployment: config.azure.openai.deploymentName,
      messageCount: messages.length,
    });

    const response = await client.getChatCompletions(
      config.azure.openai.deploymentName,
      messages,
      {
        maxTokens,
        temperature,
      }
    );

    const choice = response.choices[0];
    if (!choice || !choice.message) {
      throw new Error('No completion returned from OpenAI');
    }

    logger.debug('Received completion from Azure OpenAI', {
      finishReason: choice.finishReason,
      contentLength: choice.message.content?.length || 0,
    });

    return choice.message.content || '';
  } catch (error) {
    logger.error('Azure OpenAI completion failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      deployment: config.azure.openai.deploymentName,
    });
    throw error;
  }
}

/**
 * Generate embeddings for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  try {
    logger.debug('Generating embedding', {
      deployment: config.azure.openai.embeddingDeployment,
      textLength: text.length,
    });

    const response = await client.getEmbeddings(
      config.azure.openai.embeddingDeployment,
      [text]
    );

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI');
    }

    logger.debug('Generated embedding', { dimensions: embedding.length });

    return embedding;
  } catch (error) {
    logger.error('Azure OpenAI embedding generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      deployment: config.azure.openai.embeddingDeployment,
    });
    throw error;
  }
}

/**
 * Analyze HTML page to find search elements
 */
export async function analyzePageForSearch(html: string, storeName: string): Promise<{
  searchInputSelector?: string;
  searchButtonSelector?: string;
  searchFormAction?: string;
  instructions: string;
}> {
  const systemMessage = `You are a web scraping expert analyzing HTML to find search functionality.
Your task is to identify:
1. Search input field (CSS selector)
2. Search button (CSS selector)
3. Form action URL (if applicable)
4. Step-by-step instructions to perform a search

Respond in JSON format.`;

  const prompt = `Analyze this HTML from ${storeName} and identify the search functionality:

${html.substring(0, 5000)}

Provide:
1. CSS selector for the search input field
2. CSS selector for the search button
3. Form action URL (if form-based)
4. Instructions to search for a product

Return JSON: { "searchInputSelector": "...", "searchButtonSelector": "...", "searchFormAction": "...", "instructions": "..." }`;

  const response = await generateCompletion(prompt, {
    systemMessage,
    temperature: 0.3,
    maxTokens: 500,
  });

  try {
    return JSON.parse(response);
  } catch {
    // Fallback if JSON parsing fails
    return {
      instructions: response,
    };
  }
}

/**
 * Extract price information from HTML or text
 */
export async function extractPrice(content: string, productName: string): Promise<{
  price?: number;
  currency?: string;
  availability?: string;
  foundProductName?: string;
}> {
  const systemMessage = `You are a price extraction expert. Extract product price, currency, availability, and exact product name from web content.
If the exact product is not found, look for similar products.
Respond in JSON format only.`;

  const prompt = `Extract price information for "${productName}" from this content:

${content.substring(0, 3000)}

Return JSON: { "price": number, "currency": "NZD", "availability": "In Stock|Out of Stock|Low Stock", "foundProductName": "..." }
If product not found, return: { "availability": "Out of Stock" }`;

  const response = await generateCompletion(prompt, {
    systemMessage,
    temperature: 0.1, // Low temperature for factual extraction
    maxTokens: 300,
  });

  try {
    const parsed = JSON.parse(response);
    return {
      price: parsed.price ? parseFloat(parsed.price) : undefined,
      currency: parsed.currency || 'NZD',
      availability: parsed.availability || 'Unknown',
      foundProductName: parsed.foundProductName,
    };
  } catch (error) {
    logger.warn('Failed to parse price extraction response', { response });
    return {
      availability: 'Unknown',
    };
  }
}
