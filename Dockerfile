# Use official Playwright image with pre-installed browsers and dependencies
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY dist ./dist
COPY startup.sh ./

# Make startup script executable
RUN chmod +x startup.sh

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {if(r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "dist/server/index.js"]
