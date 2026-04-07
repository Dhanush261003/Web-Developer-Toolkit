// Debug tools functionality
function initDebugTools() {
    const clearCacheBtn = document.getElementById('clearCache');
    const hardReloadBtn = document.getElementById('hardReload');
    const viewConsoleErrorsBtn = document.getElementById('viewConsoleErrors');

    clearCacheBtn.addEventListener('click', () => {
        // Get the current active tab to determine which site's cache to clear
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                showStatus('No active tab found.');
                return;
            }

            const tab = tabs[0];
            let origin;

            try {
                // Extract origin from the tab's URL
                const url = new URL(tab.url);
                origin = url.origin;
            } catch (e) {
                showStatus('Unable to get site URL.');
                return;
            }

            // Clear cache only for the current site's origin
            chrome.browsingData.remove({
                since: 0,
                origins: [origin]
            }, {
                cache: true
            }, () => {
                if (chrome.runtime.lastError) {
                    showStatus('Failed to clear cache.');
                } else {
                    showStatus(`Cache cleared for ${origin}`);
                }
            });
        });
    });

    hardReloadBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.reload(tabs[0].id, { bypassCache: true }, () => {
                    if (chrome.runtime.lastError) {
                        showStatus('Failed to hard reload.');
                    } else {
                        showStatus('Hard reload (No Cache) triggered!');
                    }
                });
            } else {
                showStatus('No active tab found.');
            }
        });
    });

    viewConsoleErrorsBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            showStatus('No active tab found.');
            return;
        }

        try {
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getConsoleErrors'
            });

            if (response && response.errors) {
                displayConsoleErrors(response.errors);
            } else {
                showStatus('No console errors found or unable to fetch.');
            }
        } catch (error) {
            showStatus('Failed to get console errors. Please refresh the page.');
        }
    });
}

function displayConsoleErrors(errors) {
    const container = document.getElementById('consoleErrors');
    container.innerHTML = '';

    if (!errors || errors.length === 0) {
        container.innerHTML = '<div style="font-size: 12px; color: #28a745; padding: 8px;">No console errors detected!</div>';
        return;
    }

    const errorDiv = document.createElement('div');
    errorDiv.style.marginTop = '12px';
    
    errors.forEach(error => {
        const errorItem = document.createElement('div');
        errorItem.style.cssText = `
            background: #2d2d30;
            border-left: 3px solid #f44336;
            padding: 8px;
            margin-bottom: 8px;
            border-radius: 3px;
            font-size: 11px;
            color: #e0e0e0;
            word-break: break-word;
        `;
        
        let errorContent = '';
        if (error.message) {
            errorContent += `<div style="font-weight: bold; color: #f44336;">${escapeHtml(error.message)}</div>`;
        }
        if (error.stack) {
            errorContent += `<div style="color: #888; margin-top: 4px; font-family: monospace;">${escapeHtml(error.stack)}</div>`;
        }
        if (error.type) {
            errorContent += `<div style="color: #ff9800; font-size: 10px; margin-top: 4px;">Type: ${error.type}</div>`;
        }
        
        errorItem.innerHTML = errorContent;
        errorDiv.appendChild(errorItem);
    });

    container.appendChild(errorDiv);
    showStatus(`Found ${errors.length} console error(s)`);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// End of debug tools functionality
