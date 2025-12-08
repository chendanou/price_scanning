#!/bin/bash

# Startup script for Azure Web App
echo "Starting Price Survey Application..."

# Check if Playwright browsers are installed
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "Playwright browsers not found. Installing..."
  npx playwright install --with-deps chromium
else
  echo "Playwright browsers already installed."
fi

# Start the Node.js application
echo "Starting Node.js server..."
node dist/server/index.js
