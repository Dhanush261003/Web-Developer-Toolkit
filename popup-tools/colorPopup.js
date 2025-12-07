// Color picker functionality
function initColorPicker() {
    const activateBtn = document.getElementById('activateColorPicker');

    activateBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            showStatus('No active tab found to activate color picker.');
            return;
        }

        try {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'activateColorPicker'
            });
            window.close();
        } catch (error) {
            showStatus('Color picker failed to activate. Please refresh the page.');
        }
    });

    loadColorHistory();
}

function loadColorHistory() {
    chrome.storage.local.get(['colorHistory'], (result) => {
        const colors = result.colorHistory || [];
        const historyContainer = document.getElementById('colorHistory');
        historyContainer.innerHTML = '';

        if (colors.length === 0) {
            historyContainer.innerHTML = '<div style="font-size: 12px; color: #888;">No recent colors.</div>';
            return;
        }

        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.setAttribute('data-color', color);
            swatch.addEventListener('click', () => {
                navigator.clipboard.writeText(color).then(() => {
                    showStatus(`Color ${color} copied to clipboard!`);
                }).catch(err => {
                    showStatus('Failed to copy color to clipboard.');
                });
            });
            historyContainer.appendChild(swatch);
        });
    });
}
// End of color picker functionality
