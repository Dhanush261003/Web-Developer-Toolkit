// Responsive viewer functionality
function initResponsiveViewer() {
    const openMobileBtn = document.getElementById('openMobileView');
    const openDesktopBtn = document.getElementById('openDesktopView');
    const openBothViewsBtn = document.getElementById('openResponsiveViewer');
    const openSamsungMobileBtn = document.getElementById('openSamsungMobileView');
    const openRedmiMobileBtn = document.getElementById('openRedmiMobileView');
    const openRealmeMobileBtn = document.getElementById('openRealmeMobileView');
    const openOppoMobileBtn = document.getElementById('openOppoMobileView');
    const openVivoMobileBtn = document.getElementById('openVivoMobileView');
    const openAndroidTabletBtn = document.getElementById('openAndroidTabletView');

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
        sendResponsiveMessage('mobile', 100, 200, 'Mobile (100x200)');
    });

    openDesktopBtn.addEventListener('click', () => {
        sendResponsiveMessage('desktop', 1440, 900, 'Desktop (1440x900)');
    });

    openBothViewsBtn.addEventListener('click', () => {
        sendResponsiveMessage('both', null, null, 'Both Views');
    });

    if (openSamsungMobileBtn) {
        openSamsungMobileBtn.addEventListener('click', () => {
            sendResponsiveMessage('mobile', 360, 800, 'Samsung Mobile (360x800)');
        });
    }

    if (openRedmiMobileBtn) {
        openRedmiMobileBtn.addEventListener('click', () => {
            sendResponsiveMessage('mobile', 393, 851, 'Redmi Mobile (393x851)');
        });
    }

    if (openRealmeMobileBtn) {
        openRealmeMobileBtn.addEventListener('click', () => {
            sendResponsiveMessage('mobile', 360, 800, 'Realme Mobile (360x800)');
        });
    }

    if (openOppoMobileBtn) {
        openOppoMobileBtn.addEventListener('click', () => {
            sendResponsiveMessage('mobile', 360, 800, 'Oppo Mobile (360x800)');
        });
    }

    if (openVivoMobileBtn) {
        openVivoMobileBtn.addEventListener('click', () => {
            sendResponsiveMessage('mobile', 360, 800, 'Vivo Mobile (360x800)');
        });
    }

    if (openAndroidTabletBtn) {
        openAndroidTabletBtn.addEventListener('click', () => {
            sendResponsiveMessage('tablet', 800, 1280, 'Android Tablet (800x1280)');
        });
    }
}
// End of responsive viewer functionality
