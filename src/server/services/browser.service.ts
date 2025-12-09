import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from '../utils/logger';
import { config } from '../config';

// User agents for rotation (to avoid bot detection)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

let browserInstance: Browser | null = null;
let activeSessions = 0;

/**
 * Launch a browser instance with anti-bot measures
 */
export async function launchBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    activeSessions++;
    logger.info(`Reusing existing browser instance (active sessions: ${activeSessions})`);
    return browserInstance;
  }

  logger.info('Launching new browser instance...');
  logger.info('Chromium executable path check...');

  try {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    activeSessions = 1;
    logger.info('Browser launched successfully');

    return browserInstance;
  } catch (error) {
    logger.error('Failed to launch browser:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : '',
      executablePath: chromium.executablePath(),
    });
    throw error;
  }
}

/**
 * Create a new browser context with stealth settings
 */
export async function createContext(browser: Browser): Promise<BrowserContext> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const context = await browser.newContext({
    userAgent,
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: [],
    geolocation: undefined,
    colorScheme: 'light',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });

  // Add init script to hide automation
  await context.addInitScript(`
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // Add chrome object
    window.chrome = {
      runtime: {},
    };

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: 'denied' })
        : originalQuery(parameters);
  `);

  logger.info('Browser context created with stealth settings');
  return context;
}

/**
 * Create a new page with additional anti-bot measures
 */
export async function createPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();

  // Set random viewport size (within reasonable bounds)
  const width = 1280 + Math.floor(Math.random() * 640);
  const height = 720 + Math.floor(Math.random() * 360);
  await page.setViewportSize({ width, height });

  logger.info(`Page created with viewport ${width}x${height}`);
  return page;
}

/**
 * Navigate to URL with retry logic and human-like behavior
 */
export async function navigateToUrl(
  page: Page,
  url: string,
  options: {
    waitForSelector?: string;
    timeout?: number;
  } = {}
): Promise<void> {
  const { waitForSelector, timeout = config.scraping.scrapeTimeoutMs } = options;

  logger.info(`Navigating to: ${url}`);

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    // Wait for network to be idle (simulates human reading)
    await page.waitForLoadState('networkidle', { timeout: timeout / 2 }).catch(() => {
      logger.warn('Network did not become idle, continuing anyway');
    });

    // Optional: wait for specific selector
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: timeout / 2 }).catch(() => {
        logger.warn(`Selector ${waitForSelector} not found, continuing anyway`);
      });
    }

    // Random delay to simulate human behavior (1-3 seconds)
    const delay = 1000 + Math.random() * 2000;
    await page.waitForTimeout(delay);

    logger.info('Navigation completed successfully');
  } catch (error) {
    logger.error(`Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Extract page content
 */
export async function getPageContent(page: Page): Promise<string> {
  return await page.content();
}

/**
 * Take a screenshot (useful for debugging)
 */
export async function takeScreenshot(page: Page, path: string): Promise<void> {
  await page.screenshot({ path, fullPage: false });
  logger.info(`Screenshot saved to: ${path}`);
}

/**
 * Close browser context
 */
export async function closeContext(context: BrowserContext): Promise<void> {
  await context.close();
  logger.info('Browser context closed');
}

/**
 * Close browser instance if no active sessions
 */
export async function closeBrowser(): Promise<void> {
  activeSessions--;

  if (activeSessions <= 0 && browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    activeSessions = 0;
    logger.info('Browser instance closed');
  } else {
    logger.info(`Browser kept alive (active sessions: ${activeSessions})`);
  }
}

/**
 * Force close browser (cleanup)
 */
export async function forceCloseBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    activeSessions = 0;
    logger.info('Browser force closed');
  }
}
