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

    // Show progress section (for future implementation)
    const progressSection = document.getElementById('progress-section');
    if (progressSection) {
      progressSection.style.display = 'block';
    }

    console.log('Upload successful:', data);
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
