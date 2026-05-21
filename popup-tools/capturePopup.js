// Capture functionality
function initCapture() {
    const captureVisibleBtn = document.getElementById('captureVisible');
    const captureFullPageBtn = document.getElementById('captureFullPage');
    const exportFormatSelect = document.getElementById('exportFormat');

    // Capture visible area (existing functionality)
    captureVisibleBtn.addEventListener('click', async () => {
        const format = exportFormatSelect.value;
        await captureScreenshot('visible', format);
    });

    // Capture full page (new functionality)
    captureFullPageBtn.addEventListener('click', async () => {
        const format = exportFormatSelect.value;
        showStatus('Starting full page capture... This may take a while for long pages.');
        await captureScreenshot('full', format);
    });
}

async function captureScreenshot(type, format) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'captureScreenshot',
            options: { type: type, format: format }
        }, (response) => {
            if (chrome.runtime.lastError) {
                showStatus('Screenshot capture failed. Please try again.');
                reject(chrome.runtime.lastError);
            } else if (response && response.success) {
                showStatus(`${type === 'visible' ? 'Visible area' : 'Full page'} screenshot initiated. Check your downloads.`);
                resolve(response);
            } else {
                showStatus(`Screenshot capture failed: ${response?.error || 'Unknown error'}`);
                reject(new Error(response?.error || 'Unknown error'));
            }
        });
    });
}
// End of capture functionality
