// Placeholder client-side TypeScript - will be implemented in later phases

console.log('Price Survey Application - Client initialized');

// File input handling
const storesFileInput = document.getElementById('stores-file') as HTMLInputElement;
const productsFileInput = document.getElementById('products-file') as HTMLInputElement;
const startScrapeButton = document.getElementById('start-scrape') as HTMLButtonElement;

let storesFile: File | null = null;
let productsFile: File | null = null;

storesFileInput?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    storesFile = target.files[0];
    const fileNameSpan = document.getElementById('stores-file-name');
    if (fileNameSpan) {
      fileNameSpan.textContent = storesFile.name;
    }
    checkFilesReady();
  }
});

productsFileInput?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    productsFile = target.files[0];
    const fileNameSpan = document.getElementById('products-file-name');
    if (fileNameSpan) {
      fileNameSpan.textContent = productsFile.name;
    }
    checkFilesReady();
  }
});

function checkFilesReady() {
  if (storesFile && productsFile) {
    startScrapeButton.disabled = false;
  }
}

startScrapeButton?.addEventListener('click', async () => {
  if (!storesFile || !productsFile) {
    showMessage('Please select both CSV files', 'error');
    return;
  }

  try {
    // Disable button during upload
    startScrapeButton.disabled = true;
    startScrapeButton.textContent = 'Uploading...';

    // Create FormData
    const formData = new FormData();
    formData.append('storesFile', storesFile);
    formData.append('productsFile', productsFile);

    // Upload files
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle validation errors
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessages = data.errors
          .map((err: any) => `Row ${err.row}, ${err.field}: ${err.message}`)
          .join('\n');
        showMessage(`Upload failed:\n${errorMessages}`, 'error');
      } else {
        showMessage(data.message || 'Upload failed', 'error');
      }
      return;
    }

    // Success
    showMessage(
      `Upload successful! Job ID: ${data.jobId}\n${data.stores} stores and ${data.products} products loaded.`,
      'success'
    );

    // Show progress section
    const progressSection = document.getElementById('progress-section');
    if (progressSection) {
      progressSection.style.display = 'block';
    }

    console.log('Upload successful:', data);

    // Automatically start scraping
    startScrapeButton.textContent = 'Scraping...';
    await startScraping(data.jobId);
  } catch (error) {
    console.error('Upload error:', error);
    showMessage('Network error: Failed to upload files', 'error');
  } finally {
    // Re-enable button
    startScrapeButton.disabled = false;
    startScrapeButton.textContent = 'Start Price Survey';
  }
});

/**
 * Show message to user
 */
function showMessage(message: string, type: 'success' | 'error') {
  // Create or get message container
  let messageDiv = document.getElementById('message-container');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'message-container';
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 4px;
      max-width: 400px;
      z-index: 1000;
      font-family: Arial, sans-serif;
      white-space: pre-line;
    `;
    document.body.appendChild(messageDiv);
  }

  // Style based on type
  if (type === 'success') {
    messageDiv.style.backgroundColor = '#d4edda';
    messageDiv.style.color = '#155724';
    messageDiv.style.border = '1px solid #c3e6cb';
  } else {
    messageDiv.style.backgroundColor = '#f8d7da';
    messageDiv.style.color = '#721c24';
    messageDiv.style.border = '1px solid #f5c6cb';
  }

  messageDiv.textContent = message;
  messageDiv.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (messageDiv) {
      messageDiv.style.display = 'none';
    }
  }, 5000);
}

/**
 * Start scraping for a job
 */
async function startScraping(jobId: string): Promise<void> {
  try {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId }),
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.message || 'Failed to start scraping', 'error');
      return;
    }

    showMessage('Scraping started! Watch the progress below.', 'success');

    // TODO: In Phase 7, connect to Socket.IO for real-time progress updates
    // For now, poll for completion
    updateProgress(0, 'Scraping in progress...');
    pollJobStatus(jobId);
  } catch (error) {
    console.error('Scraping error:', error);
    showMessage('Network error: Failed to start scraping', 'error');
  }
}

/**
 * Poll job status until complete (placeholder until Socket.IO in Phase 7)
 */
async function pollJobStatus(jobId: string): Promise<void> {
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();

      if (!response.ok) {
        clearInterval(pollInterval);
        showMessage('Failed to get job status', 'error');
        return;
      }

      console.log('Job status:', data);

      // Update progress based on status
      if (data.status === 'completed') {
        clearInterval(pollInterval);
        updateProgress(100, 'Scraping complete!');
        showMessage('Scraping completed successfully!', 'success');

        // Fetch and display results
        await fetchAndDisplayResults(jobId);
      } else if (data.status === 'failed') {
        clearInterval(pollInterval);
        updateProgress(0, 'Scraping failed');
        const errorMsg = data.error ? `Scraping failed: ${data.error}` : 'Scraping failed. Please try again.';
        showMessage(errorMsg, 'error');
        console.error('Scraping error details:', data.error);
      } else if (data.status === 'processing') {
        // Show processing status
        updateProgress(50, 'Scraping stores and products...');
      }
    } catch (error) {
      console.error('Error polling job status:', error);
    }
  }, 2000); // Poll every 2 seconds
}

/**
 * Fetch and display results
 */
async function fetchAndDisplayResults(jobId: string): Promise<void> {
  try {
    const response = await fetch(`/api/results/${jobId}`);
    const data = await response.json();

    if (!response.ok) {
      showMessage('Failed to fetch results', 'error');
      return;
    }

    displayResults(data.results || []);
  } catch (error) {
    console.error('Error fetching results:', error);
    showMessage('Network error: Failed to fetch results', 'error');
  }
}

/**
 * Display results in table
 */
function displayResults(results: any[]): void {
  const resultsSection = document.getElementById('results-section');
  const tbody = document.getElementById('results-tbody');

  if (!resultsSection || !tbody) return;

  // Clear existing results
  tbody.innerHTML = '';

  // Populate table
  results.forEach((result) => {
    const row = document.createElement('tr');

    // Add warning class for non-exact matches
    if (!result.isExactMatch) {
      row.classList.add('replacement-row');
    }

    row.innerHTML = `
      <td>${result.productId || 'N/A'}</td>
      <td>${result.productName || 'N/A'}</td>
      <td>${result.brand || 'N/A'}</td>
      <td>${result.storeName || 'N/A'}</td>
      <td>${result.price ? `$${result.price.toFixed(2)} ${result.currency || 'NZD'}` : 'N/A'}</td>
      <td>${result.foundProductName || result.productName}</td>
      <td>${result.replacementDescription || (result.isExactMatch ? 'Exact match' : 'N/A')}</td>
    `;

    tbody.appendChild(row);
  });

  // Show results section
  resultsSection.style.display = 'block';

  // Setup export button
  const exportButton = document.getElementById('export-csv');
  if (exportButton) {
    exportButton.onclick = () => {
      const jobId = results[0]?.jobId || '';
      window.location.href = `/api/results/${jobId}/csv`;
    };
  }
}

/**
 * Update progress bar (placeholder for Phase 7 Socket.IO integration)
 */
function updateProgress(progress: number, message: string): void {
  const progressFill = document.getElementById('progress-fill') as HTMLDivElement;
  const progressText = document.getElementById('progress-text') as HTMLParagraphElement;

  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }

  if (progressText) {
    progressText.textContent = message;
  }
}
