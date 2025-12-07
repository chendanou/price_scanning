# Automated Price Survey Application

A Node.js web application that automates price surveys across multiple online stores using AI-powered web scraping, semantic product matching, and intelligent navigation.

## Features

- **File Upload**: Upload CSV files containing store and product information
- **AI-Powered Scraping**: Uses Playwright headless browser with Azure OpenAI for intelligent navigation
- **Semantic Product Matching**: Azure AI Search with vector embeddings for accurate product matching
- **Brand Prioritization**: Matches exact brands first, falls back to similar products
- **Real-time Progress**: WebSocket-based live updates during scraping
- **CSV Export**: Download results with all product and price information
- **Multi-environment Deployment**: Dev, UAT, and Production environments in Azure

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Web Scraping**: Playwright
- **AI Services**: Azure OpenAI (GPT-4), Azure AI Search
- **Frontend**: Vanilla TypeScript, Vite
- **Real-time**: Socket.IO
- **Infrastructure**: Azure Bicep
- **CI/CD**: GitHub Actions

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Azure subscription
- Azure OpenAI service with GPT-4 and text-embedding-ada-002 deployments
- Azure AI Search service

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd claude_prices
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Azure credentials
   ```

4. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:3000 in your browser
   - API health check: http://localhost:3000/api/health

## CSV File Formats

### Stores CSV
```csv
StoreName,Website URL
Walmart,https://www.walmart.com
Target,https://www.target.com
```

### Products CSV
```csv
ProductId,ProductName,Description,Brand
P001,Milk,Whole Milk 1 Gallon,Organic Valley
P002,Bread,Whole Wheat Bread,Dave's Killer Bread
```

## Deployment

### Azure Resource Groups
- Dev: `pricing_scan_rg_dev`
- UAT: `pricing_scan_rg_uat`
- Prod: `pricing_scan_rg_prod`

All resources are deployed to **Australia East** region.

### GitHub Secrets Required

For each environment (DEV, UAT, PROD), configure the following secrets:

- `AZURE_CREDENTIALS_<ENV>`: Service principal JSON
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID
- `AZURE_SEARCH_KEY_<ENV>`: AI Search admin key
- `AZURE_OPENAI_ENDPOINT_<ENV>`: OpenAI endpoint URL
- `AZURE_OPENAI_KEY_<ENV>`: OpenAI API key

### Deployment Triggers

- **Dev**: Automatic on push to `main` branch
- **UAT**: Automatic on push to `uat` branch
- **Prod**: Manual workflow dispatch or tag creation (v*)

## Project Structure

```
claude_prices/
├── .github/workflows/     # GitHub Actions CI/CD
├── infrastructure/        # Azure Bicep templates
├── src/
│   ├── server/           # Backend Express application
│   └── client/           # Frontend application
├── tests/                # Unit and integration tests
└── package.json
```

## Development Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run build:server  # Build server only
npm run build:client  # Build client only
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
```

## Architecture

### Data Flow
1. User uploads CSV files (stores and products)
2. Files are parsed and validated
3. User initiates scraping job
4. For each store:
   - Browser navigates to store URL
   - AI searches for each product
   - Price and details extracted
   - Semantic matching against catalog
   - Results stored with replacement info if needed
5. Real-time progress updates via WebSocket
6. Results displayed and exportable as CSV

### Core Services
- **Scraper Service**: Orchestrates scraping workflow
- **Browser Service**: Manages Playwright instances
- **AI Navigator Service**: AI-powered page navigation
- **AI Search Service**: Semantic product matching
- **Price Extractor Service**: Extracts prices from pages
- **Export Service**: Generates CSV exports

## Cost Estimates

### Monthly Azure Costs (per environment)
- **Dev**: ~$5-10 (Free tier + minimal AI usage)
- **UAT**: ~$15-25 (Basic tier + moderate testing)
- **Prod**: ~$25-50 (Basic tier + production usage)

**Total**: ~$45-85/month for all three environments

## Security

- HTTPS enforced in production
- Secrets managed via GitHub Secrets and Azure Key Vault
- Input validation on all endpoints
- Rate limiting on API endpoints
- Secure WebSocket connections (WSS)

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linter
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
