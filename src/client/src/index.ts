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
  console.log('Start scrape clicked');
  alert('Scraping functionality will be implemented in Phase 3-5');
});
