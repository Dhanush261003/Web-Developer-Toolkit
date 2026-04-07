// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Enable wheel scrolling on the content area for the active tab
    const contentEl = document.querySelector('.content');
    contentEl.addEventListener('wheel', (e) => {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.scrollHeight > activeTab.clientHeight) {
            e.preventDefault();
            activeTab.scrollTop += (e.deltaY > 0 ? 30 : -30);
        }
    }, { passive: false });

    // Prevent popup from closing due to errors
    window.addEventListener('error', (e) => {
        console.error('Popup error:', e.error);
        e.preventDefault();
        return false;
    });

    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        e.preventDefault();
        return false;
    });

    // Prevent popup from closing when buttons are clicked
    document.addEventListener('click', (e) => {
        // Allow normal button behavior but prevent any errors from closing popup
        try {
            // Let the event bubble normally
        } catch (error) {
            console.error('Click handler error:', error);
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);

    // Add global error boundary
    window.onerror = function(msg, url, line, col, error) {
        console.error('Global error:', msg, 'at', url, line, col, error);
        return false; // Prevent default error handling
    };

    window.onunhandledrejection = function(event) {
        console.error('Global unhandled rejection:', event.reason);
        event.preventDefault();
        return false;
    };

    // Initialize components with error handling
    const initFunctions = [
        { name: 'inspector', fn: initInspector },
        { name: 'colorPicker', fn: initColorPicker },
        { name: 'responsiveViewer', fn: initResponsiveViewer },
        { name: 'assetExtractor', fn: initAssetExtractor },
        { name: 'stackDetection', fn: initStackDetection },
        { name: 'seoAnalyzer', fn: initSEOAnalyzer },
        { name: 'capture', fn: initCapture },
        { name: 'debugTools', fn: initDebugTools }
    ];

    initFunctions.forEach(({ name, fn }) => {
        try {
            if (typeof fn === 'function') {
                fn();
            }
        } catch (e) {
            console.error(`Error initializing ${name}:`, e);
        }
    });
});

function showStatus(message) {
    let statusEl = document.getElementById('status-message');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'status-message';
        statusEl.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(statusEl);
    }
    statusEl.textContent = message;
    statusEl.style.opacity = '1';
    setTimeout(() => {
        statusEl.style.opacity = '0';
    }, 3000);
}
// End of popup functionality
