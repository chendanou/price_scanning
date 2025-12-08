#!/bin/bash

# Startup script for Azure Web App
echo "Starting Price Survey Application..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Try to install Playwright browsers
echo "Installing Playwright browsers..."

# First try with --with-deps
npx playwright install --with-deps chromium 2>&1 || {
  echo "Failed with --with-deps, trying without system dependencies..."
  # Try without system dependencies
  npx playwright install chromium 2>&1 || {
    echo "WARNING: Failed to install Playwright browsers"
    echo "Attempting to use any existing browsers..."
  }
}

# List what we have
echo "Checking for Playwright browsers..."
ls -la ~/.cache/ms-playwright/ 2>&1 || echo "No browsers in ~/.cache/ms-playwright/"
ls -la /root/.cache/ms-playwright/ 2>&1 || echo "No browsers in /root/.cache/ms-playwright/"

# Start the Node.js application
echo "Starting Node.js server..."
exec node dist/server/index.js
