// Inspector functionality
function initInspector() {
    const toggleBtn = document.getElementById('toggleInspector');
    let inspectorActive = false;

    function updateToggleButton(isActive) {
        inspectorActive = isActive;
        toggleBtn.textContent = inspectorActive ? 'Deactivate Inspector' : 'Toggle Inspector';
        toggleBtn.style.background = inspectorActive ? '#dc3545' : '';
    }

    async function getInitialInspectorState() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url || (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
            updateToggleButton(false);
            return;
        }
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getInspectorState' });
            if (response && typeof response.inspectorActive === 'boolean') {
                updateToggleButton(response.inspectorActive);
            } else {
                updateToggleButton(false);
            }
        } catch (error) {
            if (error.message.includes('Could not establish connection') || error.message.includes('Receiving end does not exist')) {
                updateToggleButton(false);
            } else {
                showStatus('Could not get inspector state. Please refresh the page.');
            }
        }
    }
    getInitialInspectorState();

    toggleBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            showStatus('No active tab found to toggle inspector.');
            return;
        }

        try {
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'toggleInspector'
            });

            if (response && typeof response.inspectorActive === 'boolean') {
                updateToggleButton(response.inspectorActive);
            } else {
                showStatus('Inspector toggle failed: Invalid response from content script.');
            }
        } catch (error) {
            showStatus('Inspector failed to toggle. Please refresh the page.');
        }
    });
}
// End of inspector functionality
