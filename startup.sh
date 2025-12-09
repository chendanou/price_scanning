#!/bin/bash

# Startup script for Azure Web App
echo "Starting Price Survey Application..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"

# Set up Playwright browsers from packaged directory
BROWSER_DIR="$HOME/.cache/ms-playwright"
PACKAGED_BROWSERS="/home/site/wwwroot/playwright-package"

echo "Setting up Playwright browsers..."

# Create cache directory if it doesn't exist
mkdir -p "$BROWSER_DIR"

# Copy pre-installed browsers from package if they exist
if [ -d "$PACKAGED_BROWSERS" ]; then
  echo "Found packaged browsers at $PACKAGED_BROWSERS"
  cp -r "$PACKAGED_BROWSERS"/* "$BROWSER_DIR/" 2>&1
  echo "Browsers copied to $BROWSER_DIR"

  # Make executables executable
  find "$BROWSER_DIR" -type f -name "chrome-*" -exec chmod +x {} \;

  ls -la "$BROWSER_DIR"
else
  echo "WARNING: No packaged browsers found at $PACKAGED_BROWSERS"
  echo "Attempting to install browsers at runtime..."
  npx playwright install chromium 2>&1 || echo "Failed to install browsers"
fi

# List what we have
echo "Final browser check:"
ls -la "$BROWSER_DIR" 2>&1 || echo "No browsers in $BROWSER_DIR"

# Start the Node.js application
echo "Starting Node.js server..."
exec node dist/server/index.js
