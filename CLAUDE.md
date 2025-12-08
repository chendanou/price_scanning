# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated price survey application that scrapes product prices from multiple online stores using AI-powered web scraping. The system uses Azure OpenAI for intelligent page navigation and Azure AI Search for semantic product matching with brand prioritization.

## Build and Development Commands

### Development
```bash
npm run dev              # Start dev server with hot reload (tsx + nodemon)
npm run build            # Full production build (server + client)
npm run build:server     # Build server only (TypeScript compilation)
npm run build:client     # Build client only (Vite)
npm start               # Run production build
```

### Testing and Linting
```bash
npm test                # Run all tests with Vitest
npm run test:ui         # Open Vitest UI for interactive testing
npm run lint            # Run ESLint on TypeScript files
npm run lint:fix        # Auto-fix linting issues
```

### Playwright Setup
```bash
npx playwright install chromium          # Install browser for scraping
npx playwright install --with-deps      # Install with system dependencies
```

## Architecture

### Build Output Structure
```
dist/
├── server/          # Compiled server code (from src/server/)
└── client/          # Built client assets (from src/client/)
```

**Critical Path Resolution**: The server code in `dist/server/` serves static files from `dist/client/`. Use relative path `../client` in server code, NOT `../../client`.

### Configuration System

Configuration is validated using Zod schemas in `src/server/config/index.ts`. All config values come from environment variables with defaults. The config module is imported by most services, so:

- **Avoid circular dependencies**: The logger (`src/server/utils/logger.ts`) MUST NOT import the config module
- Logger uses environment variables directly to prevent initialization issues
- Config is validated at startup; invalid values cause immediate failure

### Azure Deployment Specifics

**Port Binding**: Azure App Service sets `PORT=8080`. The server MUST:
- Read `process.env.PORT` directly (not from config)
- Bind to `0.0.0.0` (all interfaces), not `localhost`
- This is implemented in `src/server/index.ts`

**Logging in Azure**:
- Azure environment detected via `WEBSITE_INSTANCE_ID` or `WEBSITE_SITE_NAME`
- Azure uses `/home/LogFiles/Application` (writable)
- Local development uses `logs/` directory
- Never attempt to create directories in `/home/site/wwwroot` on Azure

**Static Files**:
- Client build outputs to `dist/client/`
- Server must serve from `path.join(__dirname, '../client')` (relative to `dist/server/`)

### TypeScript Configuration

Two separate tsconfig files for isolated compilation:
- `tsconfig.server.json`: Compiles `src/server/` → `dist/server/`
- `tsconfig.client.json`: Compiles `src/client/` (then Vite bundles)

Strict mode enabled with:
- `noUnusedLocals` and `noUnusedParameters`: Prefix unused params with `_` (e.g., `_req`, `_next`)
- `noImplicitReturns` and `noFallthroughCasesInSwitch`

### Multi-Environment Infrastructure

**Three environments**: Dev, UAT, Prod
- Each has separate workflow: `.github/workflows/deploy-{env}.yml`
- Each deploys to separate Azure resource group: `pricing_scan_rg_{env}`
- Region: Australia East for all environments

**Deployment Triggers**:
- Dev: Automatic on push to `main`
- UAT: Automatic on push to `uat` branch
- Prod: Manual workflow_dispatch or tag push (v*)

**Infrastructure**: Azure Bicep templates in `infrastructure/`
- `main.bicep`: Orchestrates all modules
- `modules/app-service.bicep`: App Service + Plan (F1 for dev, B1 for uat/prod)
- `modules/ai-search.bicep`: Azure AI Search (free for dev, basic for uat/prod)
- `modules/storage.bicep`: Blob Storage for uploads/results
- Parameters per environment: `infrastructure/parameters/{env}.parameters.json`

### Deployment Pipeline Flow

1. **Build Job**:
   - `npm ci` (uses package-lock.json for reproducible installs)
   - Compile TypeScript and bundle client with Vite
   - Install Playwright browsers
   - Upload artifact: `dist/`, `node_modules/`, `package.json`, `package-lock.json`

2. **Deploy Infrastructure Job**:
   - Create resource group via `az group create`
   - Deploy Bicep with `azure/arm-deploy@v1`
   - Set App Service settings (Azure Search, OpenAI endpoints/keys)

3. **Deploy App Job**:
   - Download build artifact
   - Set startup command: `node dist/server/index.js`
   - Deploy to Azure Web App with `azure/webapps-deploy@v2`

**Important**: The startup command is explicitly set in the workflow, not in package.json scripts.

## Environment Variables

Required for Azure services (see `.env.example`):
- `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_KEY`: AI Search service
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`: OpenAI service
- `AZURE_OPENAI_DEPLOYMENT_NAME`: GPT-4 deployment name
- `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`: text-embedding-ada-002 deployment

Scraping configuration (defaults work for most cases):
- `MAX_CONCURRENT_BROWSERS=2`: Limit browser instances
- `DELAY_BETWEEN_STORES_MS=5000`: Anti-bot measure
- `DELAY_BETWEEN_PRODUCTS_MS=2000`: Anti-bot measure
- `MAX_RETRIES=3`: Retry failed scrapes

## CSV File Formats

### Stores CSV
Must have exactly these columns (case-sensitive):
- `StoreName`: Display name for the store
- `Website URL`: Full URL including protocol (https://)

### Products CSV
Must have exactly these columns (case-sensitive):
- `ProductId`: Unique identifier
- `ProductName`: Product name for searching
- `Description`: Product description (used for semantic matching)
- `Brand`: Brand name (prioritized in matching)

## WebSocket Events (Socket.IO)

Real-time progress updates during scraping:
- Client connects to server socket on same origin
- Server emits progress events with job status
- Used for live UI updates without polling

## Common Debugging Scenarios

### Azure Deployment Issues

**"Site failed to startup after 6sec"**:
- Check PORT binding: Must use `process.env.PORT` and bind to `0.0.0.0`
- Check logger initialization: Must not create directories in wwwroot
- View container logs in Azure Portal under "Deployment Center > Logs"

**"Internal server error" on homepage**:
- Static file path issue: Verify paths are relative to `dist/server/`
- Check `dist/client/index.html` exists in deployed artifact

**Build failures in GitHub Actions**:
- `package-lock.json` missing: Must be committed (used for npm ci cache)
- TypeScript errors: Check unused parameters are prefixed with `_`
- Vite errors: Ensure `index.html` is in `src/client/` (not `src/client/public/`)

### Local Development Issues

**Logger errors on startup**:
- Ensure `logs/` directory can be created or exists
- Logger will warn and fall back to console-only if file logging fails

**Playwright browser not found**:
- Run `npx playwright install chromium`
- For CI/CD: Use `npx playwright install --with-deps chromium`

## Technology Constraints

- **Node.js**: 20.x or higher required (specified in package.json engines)
- **Playwright**: Only Chromium browser is installed (to minimize size)
- **Frontend**: Vanilla TypeScript (no framework) - keep it simple
- **Database**: None currently - all data in memory during scraping session
- **Azure Free Tier Limits**: Dev environment uses free SKUs with quotas

## Future Service Implementation Notes

The following services are defined in the architecture but not yet implemented:
- `src/server/services/csv-parser.service.ts`
- `src/server/services/scraper.service.ts`
- `src/server/services/browser.service.ts`
- `src/server/services/ai-navigator.service.ts`
- `src/server/services/ai-search.service.ts`
- `src/server/services/price-extractor.service.ts`
- `src/server/services/export.service.ts`

These will be needed for Phase 3+ of the implementation plan.
