// Responsive viewer functionality
function initResponsiveViewer() {
    const openMobileBtn = document.getElementById('openMobileView');
    const openDesktopBtn = document.getElementById('openDesktopView');
    const openBothViewsBtn = document.getElementById('openResponsiveViewer');

    const sendResponsiveMessage = async (viewType, width, height, deviceName) => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            showStatus('No active tab found to open responsive viewer.');
            return;
        }

        try {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'showResponsivePreview',
                viewType: viewType,
                width: width,
                height: height,
                deviceName: deviceName
            });
        } catch (error) {
            showStatus('Responsive viewer failed. Please refresh the page.');
        }
    };

    openMobileBtn.addEventListener('click', () => {
        sendResponsiveMessage('mobile', 375, 667, 'Mobile (375x667)');
    });

    openDesktopBtn.addEventListener('click', () => {
        sendResponsiveMessage('desktop', 1440, 900, 'Desktop (1440x900)');
    });

    openBothViewsBtn.addEventListener('click', () => {
        sendResponsiveMessage('both', null, null, 'Both Views');
    });
}
// End of responsive viewer functionality
