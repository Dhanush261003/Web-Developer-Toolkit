// Debug tools functionality
function initDebugTools() {
    const clearCacheBtn = document.getElementById('clearCache');

    clearCacheBtn.addEventListener('click', () => {
        chrome.browsingData.remove({
            since: 0
        }, {
            cache: true
        }, () => {
            if (chrome.runtime.lastError) {
                showStatus('Failed to clear cache.');
            } else {
                showStatus('Cache cleared successfully!');
            }
        });
    });
}
// End of debug tools functionality
