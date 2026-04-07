/* Content script for the web developer toolkit */

// Immediately invoked function expression (IIFE) to encapsulate the toolkit code
(function() {
    'use strict';

    // Global state object to track the current state of toolkit features
    let toolkitState = {
        inspectorActive: false,
        colorPickerActive: false,
        inspectorOptions: {
            showPseudo: true,
            showMediaQueries: true,
            enableLiveEdit: true
        },
        pinnedElement: null,
        overlayElements: [],
        eventListeners: []
    };

    // Initialize toolkit when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeToolkit);
    } else {
        initializeToolkit();
    }

    // Main initialization function
    function initializeToolkit() {
        // Inject CSS styles if not already present
        if (!document.getElementById('dev-toolkit-styles')) {
            injectStyles();
        }

    // Set up message listener for communication with background script and popup
    setupMessageListener();

    // FIX START - Issue 5: Media Query "Show more" button not working
    // Add event delegation for media query toggles in info panel
    document.addEventListener('click', (ev) => {
        const btn = ev.target;
        if (!btn.classList.contains('dev-toolkit-mq-toggle')) return;
        ev.stopPropagation();
        const parent = btn.closest('.dev-toolkit-mq');
        if (!parent) return;
        if (parent.classList.contains('expanded')) {
            parent.classList.remove('expanded');
            btn.textContent = 'Show more';
        } else {
            parent.classList.add('expanded');
            btn.textContent = 'Show less';
        }
    });
    // FIX END - Issue 5

        console.log('Web Developer Toolkit content script initialized');
    }

    // Function to inject CSS styles for toolkit overlays and UI elements
    function injectStyles() {
        const styles = document.createElement('style');
        styles.id = 'dev-toolkit-styles';
        // CSS styles for various toolkit UI components including overlays, info panels, color pickers, toasts, and responsive previews
        styles.textContent = `
            .dev-toolkit-overlay {
                position: fixed !important;
                pointer-events: none !important;
                z-index: 999999 !important;
                border: 2px solid #007bff !important;
                background: rgba(0, 123, 255, 0.1) !important;
                box-sizing: border-box !important;
                transition: all 0.1s ease !important;
            }
            
            .dev-toolkit-info {
                position: fixed !important;
                background: rgba(0, 0, 0, 0.95) !important;
                color: white !important;
                padding: 12px !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
                z-index: 1000000 !important;
                pointer-events: none !important;
                max-width: 350px !important;
                max-height: 500px !important;
                overflow-y: auto !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
                line-height: 1.4 !important;
            }
            
            .dev-toolkit-info::-webkit-scrollbar {
                width: 8px !important;
            }
            
            .dev-toolkit-info::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 4px !important;
            }
            
            .dev-toolkit-info::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3) !important;
                border-radius: 4px !important;
            }
            
            .dev-toolkit-info::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.5) !important;
            }
            
            .dev-toolkit-info.active {
                pointer-events: auto !important;
            }

            .dev-toolkit-selected-overlay {
                position: fixed !important;
                pointer-events: none !important;
                z-index: 1000001 !important;
                border: 2px dashed #f59e0b !important;
                box-sizing: border-box !important;
                transition: all 0.08s ease !important;
            }
            
            /* When pinned, allow interactions (inputs/buttons) inside the info panel */
            .dev-toolkit-info.pinned {
                pointer-events: auto !important;
            }
            
            .dev-toolkit-editable {
                pointer-events: auto !important;
            }

            .dev-toolkit-css-input {
                pointer-events: auto !important;
            }

            .dev-toolkit-css-value {
                pointer-events: auto !important;
            }
            
            .dev-toolkit-info-row {
                margin-bottom: 4px !important;
                display: flex !important;
                align-items: center !important;
            }
            
            .dev-toolkit-info-label {
                color: #66b3ff !important;
                font-weight: bold !important;
                margin-right: 8px !important;
                min-width: 80px !important;
            }
            
            .dev-toolkit-color-preview {
                display: inline-block !important;
                width: 16px !important;
                height: 16px !important;
                border-radius: 3px !important;
                border: 1px solid #fff !important;
                margin-left: 8px !important;
                vertical-align: middle !important;
            }
            
            .dev-toolkit-crosshair {
                position: fixed !important;
                width: 24px !important;
                height: 24px !important;
                border: 2px solid #ff0000 !important;
                border-radius: 50% !important;
                pointer-events: none !important;
                z-index: 1000001 !important;
                transform: translate(-50%, -50%) !important;
                background: rgba(255, 0, 0, 0.1) !important;
                box-shadow: 0 0 0 4px rgba(255, 0, 0, 0.3) !important;
                transition: all 0.1s ease !important;
            }
            
            .dev-toolkit-crosshair::before {
                content: '' !important;
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                width: 2px !important;
                height: 100% !important;
                background: #ff0000 !important;
                transform: translate(-50%, -50%) !important;
            }
            
            .dev-toolkit-crosshair::after {
                content: '' !important;
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                width: 100% !important;
                height: 2px !important;
                background: #ff0000 !important;
                transform: translate(-50%, -50%) !important;
            }
            
            /* Magnifier/Loupe color picker styles */
            .dev-toolkit-magnifier {
                position: fixed !important;
                width: 50px !important;
                height: 50px !important;
                border-radius: 50% !important;
                border: 1px solid #333 !important;
                box-shadow: 0 1px 5px rgba(0, 0, 0, 0.5), inset 0 0 2px rgba(0, 0, 0, 0.3) !important;
                pointer-events: none !important;
                z-index: 1000002 !important;
                overflow: hidden !important;
                background: #fff !important;
            }
            
            .dev-toolkit-magnifier-canvas {
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                image-rendering: pixelated !important;
                border-radius: 50% !important;
                overflow: hidden !important;
            }
            
            .dev-toolkit-magnifier-crosshair {
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                width: 12px !important;
                height: 12px !important;
                transform: translate(-50%, -50%) !important;
                pointer-events: none !important;
            }
            
            .dev-toolkit-magnifier-crosshair::before,
            .dev-toolkit-magnifier-crosshair::after {
                content: '' !important;
                position: absolute !important;
                background: #ff0000 !important;
            }
            
            .dev-toolkit-magnifier-crosshair::before {
                top: 50% !important;
                left: 0 !important;
                width: 100% !important;
                height: 1px !important;
                transform: translateY(-50%) !important;
            }
            
            .dev-toolkit-magnifier-crosshair::after {
                left: 50% !important;
                top: 0 !important;
                width: 1px !important;
                height: 100% !important;
                transform: translateX(-50%) !important;
            }
            
            .dev-toolkit-magnifier-color-info {
                display: none !important;
            }
            
            .dev-toolkit-magnifier-color-swatch {
                width: 16px !important;
                height: 16px !important;
                border-radius: 3px !important;
                border: 1px solid #fff !important;
            }
            
            .dev-toolkit-color-popup {
                position: fixed !important;
                background: rgba(0, 0, 0, 0.95) !important;
                color: white !important;
                padding: 12px !important;
                border-radius: 8px !important;
                font-size: 12px !important;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
                z-index: 1000001 !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 8px !important;
            }

            .color-swatch {
                width: 40px !important;
                height: 40px !important;
                border-radius: 4px !important;
                border: 2px solid #fff !important;
            }

            .color-info {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 4px !important;
            }

            .color-hex, .color-rgb {
                cursor: pointer !important;
                padding: 2px 4px !important;
                border-radius: 3px !important;
                background: rgba(255, 255, 255, 0.1) !important;
                transition: background 0.2s !important;
            }

            .color-hex:hover, .color-rgb:hover {
                background: rgba(255, 255, 255, 0.2) !important;
            }

            .dev-toolkit-responsive-overlay {
                position: fixed !important;
                inset: 0 !important;
                background: rgba(0,0,0,0.92) !important;
                z-index: 99999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .dev-toolkit-responsive-container {
                display: flex !important;
                gap: 40px !important;
                padding: 40px !important;
                max-width: 1920px !important;
                max-height: 90vh !important;
                align-items: flex-start !important;
                overflow: hidden !important;
            }

            .dev-toolkit-device-frame {
                background: #161a1e !important;
                border-radius: 28px !important;
                box-shadow: 0 8px 48px rgb(0 0 0 / 40%) !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                padding: 18px 12px !important;
            }

            .dev-toolkit-mobile-frame {
                width: 430px !important; /* Default for both views */
                height: 932px !important; /* Default for both views */
                border-radius: 46px !important;
                border: 8px solid #222 !important;
                box-shadow: 0 0 0 12px #292a2c !important;
            }

            .dev-toolkit-desktop-frame {
                width: 1440px !important; /* Default for both views */
                height: 900px !important; /* Default for both views */
                border-radius: 18px !important;
                border: 4px solid #222 !important;
                box-shadow: 0 0 0 6px #292a2c !important;
            }

            /* Specific frame sizes for single views */
            .dev-toolkit-single-mobile-frame {
                width: 375px !important; /* Specific mobile width */
                height: 667px !important; /* Specific mobile height */
                border-radius: 46px !important;
                border: 8px solid #222 !important;
                box-shadow: 0 0 0 12px #292a2c !important;
            }

            .dev-toolkit-single-desktop-frame {
                width: 1440px !important;
                height: 900px !important;
                border-radius: 18px !important;
                border: 4px solid #222 !important;
                box-shadow: 0 0 0 6px #292a2c !important;
            }


            .dev-toolkit-device-header {
                color: #efefef !important;
                background: #24292f !important;
                font-family: 'system-ui', sans-serif !important;
                font-size: 15px !important;
                padding: 8px 12px !important;
                margin-bottom: 8px !important;
                border-radius: 8px !important;
                width: 90% !important;
                text-align: center !important;
            }

            .dev-toolkit-device-iframe {
                width: 100% !important;
                height: 95% !important;
                border: none !important;
                border-radius: 18px !important;
                background: #fff !important;
                box-shadow: 0 2px 8px rgb(0 0 0 / 15%) !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
            }

            .dev-toolkit-device-iframe::-webkit-scrollbar {
                display: none !important;
            }

            .dev-toolkit-responsive-close {
                position: absolute !important;
                top: 20px !important;
                right: 20px !important;
                z-index: 100000 !important;
                background: #ff5f57 !important;
                border: none !important;
                border-radius: 50% !important;
                width: 40px !important;
                height: 40px !important;
                cursor: pointer !important;
                color: white !important;
                font-size: 24px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .dev-toolkit-toast {
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                background: rgba(0, 0, 0, 0.9) !important;
                color: white !important;
                padding: 12px 20px !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                font-family: system-ui, -apple-system, sans-serif !important;
                z-index: 1000002 !important;
                max-width: 300px !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
                animation: slideInRight 0.3s ease !important;
            }

            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            /* Media query preview (collapsed) */
            .dev-toolkit-mq-preview {
                max-height: 4.2em !important; /* roughly 3 lines */
                overflow: hidden !important;
                white-space: pre-wrap !important;
                font-size: 11px !important;
                color: #9fbfe8 !important;
                margin: 4px 0 !important;
            }
            .dev-toolkit-mq {
                display: flex !important;
                flex-direction: column !important;
                gap: 6px !important;
            }
            .dev-toolkit-mq.expanded .dev-toolkit-mq-preview {
                max-height: none !important;
            }
            .dev-toolkit-mq-toggle {
                background: transparent !important;
                border: 1px solid rgba(255,255,255,0.08) !important;
                color: #cfe9ff !important;
                padding: 4px 8px !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-size: 11px !important;
                align-self: flex-start !important;
            }

            /* Pinned element editor styles */
            .dev-toolkit-editor-section {
                margin-top: 12px !important;
                padding-top: 12px !important;
                border-top: 1px solid rgba(255,255,255,0.1) !important;
            }

            .dev-toolkit-editor-title {
                color: #66b3ff !important;
                font-weight: bold !important;
                margin-bottom: 10px !important;
                font-size: 12px !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
            }

            .dev-toolkit-prop-group {
                margin-bottom: 10px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 4px !important;
            }

            .dev-toolkit-prop-label {
                font-size: 10px !important;
                color: #9fbfe8 !important;
                font-weight: bold !important;
                text-transform: uppercase !important;
                letter-spacing: 0.3px !important;
            }

            .dev-toolkit-prop-controls {
                display: flex !important;
                gap: 6px !important;
                align-items: center !important;
            }

            .dev-toolkit-color-input {
                width: 40px !important;
                height: 28px !important;
                border: 1px solid rgba(255,255,255,0.2) !important;
                border-radius: 3px !important;
                cursor: pointer !important;
                padding: 2px !important;
            }

            .dev-toolkit-text-input {
                flex: 1 !important;
                padding: 4px 6px !important;
                background: rgba(0,0,0,0.3) !important;
                border: 1px solid rgba(255,255,255,0.15) !important;
                border-radius: 3px !important;
                color: #e0e0e0 !important;
                font-size: 11px !important;
                font-family: 'Monaco', 'Menlo', monospace !important;
            }

            .dev-toolkit-slider {
                flex: 1 !important;
                height: 6px !important;
                border-radius: 3px !important;
                outline: none !important;
                background: rgba(255,255,255,0.1) !important;
                -webkit-appearance: none !important;
            }

            .dev-toolkit-slider::-webkit-slider-thumb {
                -webkit-appearance: none !important;
                appearance: none !important;
                width: 14px !important;
                height: 14px !important;
                border-radius: 50% !important;
                background: #3b82f6 !important;
                cursor: pointer !important;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
            }

            .dev-toolkit-slider::-moz-range-thumb {
                width: 14px !important;
                height: 14px !important;
                border-radius: 50% !important;
                background: #3b82f6 !important;
                cursor: pointer !important;
                border: none !important;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
            }

            .dev-toolkit-select {
                flex: 1 !important;
                padding: 4px 6px !important;
                background: rgba(0,0,0,0.3) !important;
                border: 1px solid rgba(255,255,255,0.15) !important;
                border-radius: 3px !important;
                color: #e0e0e0 !important;
                font-size: 11px !important;
            }

            .dev-toolkit-editor-buttons {
                display: flex !important;
                gap: 8px !important;
                margin-top: 12px !important;
            }

            .dev-toolkit-apply-btn {
                flex: 1 !important;
                padding: 6px 12px !important;
                background: #10b981 !important;
                color: white !important;
                border: none !important;
                border-radius: 3px !important;
                cursor: pointer !important;
                font-size: 11px !important;
                font-weight: bold !important;
                transition: all 0.15s !important;
            }

            .dev-toolkit-apply-btn:hover {
                background: #059669 !important;
                box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3) !important;
            }

            .dev-toolkit-reset-btn {
                flex: 1 !important;
                padding: 6px 12px !important;
                background: #ef4444 !important;
                color: white !important;
                border: none !important;
                border-radius: 3px !important;
                cursor: pointer !important;
                font-size: 11px !important;
                font-weight: bold !important;
                transition: all 0.15s !important;
            }

            .dev-toolkit-reset-btn:hover {
                background: #dc2626 !important;
                box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3) !important;
            }
        `;

        document.head.appendChild(styles);
    }

    // Set up listener for messages from background script or popup
    // Handles various actions requested by the extension UI
    function setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            try {
                switch (request.action) {
                    case 'toggleInspector':
                        // Toggle the inspector tool on/off
                        const newInspectorState = toggleInspector();
                        sendResponse({ success: true, inspectorActive: newInspectorState });
                        break;

                    case 'setInspectorOptions':
                        toolkitState.inspectorOptions = Object.assign({}, toolkitState.inspectorOptions, request.options || {});
                        sendResponse({ success: true, options: toolkitState.inspectorOptions });
                        break;

                    case 'getInspectorOptions':
                        sendResponse({ success: true, options: toolkitState.inspectorOptions });
                        break;

                    case 'getInspectorState':
                        // Return current inspector state
                        sendResponse({ success: true, inspectorActive: toolkitState.inspectorActive });
                        break;

                    case 'applyLiveCSS':
                        // Apply CSS property and value from the live edit text box
                        const applyResult = applyLiveCSS(request.property, request.value);
                        sendResponse({ success: applyResult });
                        break;

                    case 'clearLiveCSS':
                        // Clear all applied live CSS changes
                        clearAllLiveCSS();
                        sendResponse({ success: true });
                        break;

                    case 'activateColorPicker':
                        // Activate the color picker tool
                        activateColorPicker();
                        sendResponse({ success: true });
                        break;

                    case 'extractAssets':
                        // Extract page assets based on filters
                        const filters = request.filters || { includeImages: true, includeVideos: true, includeSvgs: true };
                        const assets = extractAssets(filters);
                        sendResponse({ success: true, assets });
                        break;

                    case 'detectTechStack':
                        // Detect technologies used on the page
                        const stack = detectTechStack();
                        sendResponse({ success: true, stack });
                        break;

                    case 'analyzeSEO':
                        // Perform SEO analysis on the page
                        const seo = analyzeSEO();
                        sendResponse({ success: true, seo });
                        break;

                    case 'validateHTML':
                        // Validate HTML structure and accessibility
                        const validation = validateHTML();
                        sendResponse({ success: true, validation });
                        break;

                    case 'optimizeImages':
                        // Optimize images on the page for performance
                        optimizeImages();
                        sendResponse({ success: true });
                        break;

                    case 'showResponsivePreview':
                        // Show responsive preview with specified parameters
                        showResponsivePreview(request.viewType, request.width, request.height, request.deviceName);
                        sendResponse({ success: true });
                        break;

                    case 'getSelectedElementInfo':
                        // Return info about the currently pinned/selected element
                        if (toolkitState.pinnedElement) {
                            try {
                                const computed = window.getComputedStyle(toolkitState.pinnedElement);
                                const info = getElementInfo(toolkitState.pinnedElement, computed);
                                sendResponse({ success: true, info });
                            } catch (err) {
                                sendResponse({ success: false, error: err.message });
                            }
                        } else {
                            sendResponse({ success: true, info: null });
                        }
                        break;

                    case 'applyStyleToSelected':
                        // Apply a single style/property to the pinned element
                        if (!toolkitState.pinnedElement) {
                            sendResponse({ success: false, error: 'No element selected' });
                            break;
                        }
                        try {
                            const prop = request.property;
                            const value = request.value;
                            const changes = {};
                            changes[prop] = value;
                            applyPropertiesToElement(toolkitState.pinnedElement, changes);
                            // Return updated info
                            const computed2 = window.getComputedStyle(toolkitState.pinnedElement);
                            const updated = getElementInfo(toolkitState.pinnedElement, computed2);
                            // Also notify popup asynchronously that element updated
                            chrome.runtime.sendMessage({ action: 'elementUpdated', info: updated });
                            sendResponse({ success: true, info: updated });
                        } catch (err) {
                            sendResponse({ success: false, error: err.message });
                        }
                        break;

                    case 'unpinSelectedElement':
                        // Unpin currently selected element
                        if (toolkitState.pinnedElement) {
                            toolkitState.pinnedElement = null;
                            const infoEl = document.querySelector('.dev-toolkit-info');
                            if (infoEl) infoEl.classList.remove('pinned');
                            sendResponse({ success: true });
                            // notify popup
                            chrome.runtime.sendMessage({ action: 'elementUnselected' });
                        } else {
                            sendResponse({ success: true });
                        }
                        break;

                    case 'getConsoleErrors':
                        // Capture console errors from the page
                        const errors = getConsoleErrors();
                        sendResponse({ success: true, errors });
                        break;

                    case 'ping':
                        // Respond to ping to indicate content script is ready
                        sendResponse({ pong: true });
                        break;

                    default:
                        // Unknown action received
                        console.log('Unknown message action:', request.action);
                        sendResponse({ success: false, error: 'Unknown action' });
                }
            } catch (error) {
                console.error('Content script error:', error);
                sendResponse({ success: false, error: error.message });
            }

            return true; // Keep message channel open for async response
        });
    }

    // Toggle inspector tool on or off
    function toggleInspector() {
        if (toolkitState.inspectorActive) {
            deactivateInspector();
        } else {
            activateInspector();
        }
        return toolkitState.inspectorActive;
    }

    // Activate the HTML/CSS inspector tool
    function activateInspector() {
        if (toolkitState.inspectorActive) return;

        toolkitState.inspectorActive = true;

        // Create overlay and info display elements
        const overlay = createOverlayElement();
        const info = createInfoElement();

        // Track overlay elements for cleanup
        toolkitState.overlayElements.push(overlay, info);

        // Set up event handlers for mouse movement, clicks, and keyboard
        const mouseMoveHandler = (e) => handleInspectorMouseMove(e, overlay, info);
        const clickHandler = (e) => handleInspectorClick(e);
        const keyHandler = (e) => handleInspectorKeyboard(e);
        const scrollHandler = () => updatePositions();
        const resizeHandler = () => updatePositions();

        // Attach event listeners
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('click', clickHandler);
        document.addEventListener('keydown', keyHandler);
        window.addEventListener('scroll', scrollHandler);
        window.addEventListener('resize', resizeHandler);

        // Track event listeners for cleanup
        toolkitState.eventListeners.push(
            { element: document, event: 'mousemove', handler: mouseMoveHandler },
            { element: document, event: 'click', handler: clickHandler },
            { element: document, event: 'keydown', handler: keyHandler },
            { element: window, event: 'scroll', handler: scrollHandler },
            { element: window, event: 'resize', handler: resizeHandler }
        );

        // Show activation message
        showToast('Inspector activated. Press ESC to deactivate.');
    }

    // Deactivate the HTML/CSS inspector tool and clean up
    function deactivateInspector() {
        if (!toolkitState.inspectorActive) return;

        toolkitState.inspectorActive = false;

        // Clear styles for pinned element
        if (toolkitState.pinnedElement) {
            clearStylesForElement(toolkitState.pinnedElement);
            toolkitState.pinnedElement = null;
        }

        // Remove overlay elements from the DOM
        toolkitState.overlayElements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        toolkitState.overlayElements = [];

        // Remove selected overlay if present
        const selOverlay = document.querySelector('.dev-toolkit-selected-overlay');
        if (selOverlay && selOverlay.parentNode) {
            selOverlay.parentNode.removeChild(selOverlay);
        }

        // Remove all event listeners attached during activation
        toolkitState.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        toolkitState.eventListeners = [];

        // Ensure info panel is not pinned / interactive after deactivation
        const info = document.querySelector('.dev-toolkit-info');
        if (info && info.classList.contains('pinned')) info.classList.remove('pinned');

        // Show deactivation message
        showToast('Inspector deactivated.');
    }

    // Create the overlay element that highlights the inspected element
    function createOverlayElement() {
        const overlay = document.createElement('div');
        overlay.className = 'dev-toolkit-overlay';
        overlay.style.display = 'none';
        document.body.appendChild(overlay);
        return overlay;
    }

    // Create a separate overlay for the selected/pinned element (distinct color)
    function createSelectedOverlayElement() {
        let sel = document.querySelector('.dev-toolkit-selected-overlay');
        if (sel) return sel;
        const overlay = document.createElement('div');
        overlay.className = 'dev-toolkit-selected-overlay';
        overlay.style.display = 'none';
        document.body.appendChild(overlay);
        return overlay;
    }

    // Create the info panel that displays element details
    function createInfoElement() {
        const info = document.createElement('div');
        info.className = 'dev-toolkit-info';
        info.style.display = 'none';
        document.body.appendChild(info);
        return info;
    }

    // FIX START - Issue 4: Overlay position must include scroll offset
    // Function to update positions of overlay and info panel on scroll/resize
    function updatePositions() {
        const overlay = document.querySelector('.dev-toolkit-overlay');
        const info = document.querySelector('.dev-toolkit-info');
        const selectedOverlay = document.querySelector('.dev-toolkit-selected-overlay');

        if (toolkitState.pinnedElement) {
            // Update pinned element overlay and info
            const rect = toolkitState.pinnedElement.getBoundingClientRect();
            if (overlay) {
                overlay.style.left = (rect.left + window.scrollX) + 'px';
                overlay.style.top = (rect.top + window.scrollY) + 'px';
                overlay.style.width = rect.width + 'px';
                overlay.style.height = rect.height + 'px';
            }
            if (selectedOverlay) {
                selectedOverlay.style.left = (rect.left + window.scrollX) + 'px';
                selectedOverlay.style.top = (rect.top + window.scrollY) + 'px';
                selectedOverlay.style.width = rect.width + 'px';
                selectedOverlay.style.height = rect.height + 'px';
            }
            // Info panel position is fixed, no need to update
        }
    }
    // FIX END - Issue 4

    // Handle mouse movement during inspector mode
    // Updates overlay and info panel based on element under cursor
    function handleInspectorMouseMove(e, overlay, info) {
        // If an element is pinned, don't update hover overlay (pinned stays open)
        if (toolkitState.pinnedElement) return;
        
        // Don't update if we're currently editing
        if (info.dataset.isEditing === 'true') {
            return;
        }

        // Get the element at the mouse position
        const element = document.elementFromPoint(e.clientX, e.clientY);
        // Ignore toolkit elements to prevent self-inspection
        if (!element || element.classList.contains('dev-toolkit-overlay') || 
            element.classList.contains('dev-toolkit-info') ||
            element.classList.contains('dev-toolkit-crosshair')) return;
        
        // Update overlay position to match the element
        const rect = element.getBoundingClientRect();

        overlay.style.left = rect.left + 'px';
        overlay.style.top = rect.top + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.display = 'block';

        // Position info panel near the mouse cursor with smart positioning
        let infoX = e.clientX + 12;
        let infoY = e.clientY + 12;

        // Prevent info panel from going off-screen right
        const infoWidth = 280;
        if (infoX + infoWidth > window.innerWidth) {
            infoX = Math.max(0, e.clientX - infoWidth - 12);
        }

        // Prevent info panel from going off-screen bottom
        const infoHeight = 300;
        if (infoY + infoHeight > window.innerHeight) {
            infoY = Math.max(0, e.clientY - infoHeight - 12);
        }

        info.style.left = infoX + 'px';
        info.style.top = infoY + 'px';
        info.style.display = 'block';
        
        // ensure ephemeral info doesn't capture pointer events (so hover remains smooth)
        if (info.classList.contains('pinned')) info.classList.remove('pinned');
        // Add active class to enable pointer events for inline editing
        info.classList.add('active');
        
        // Get computed styles and element information
        const computedStyle = window.getComputedStyle(element);
        const elementInfo = getElementInfo(element, computedStyle);
        
        // Update info panel content
        info.innerHTML = formatElementInfo(elementInfo);

        // Wire media-query toggles for hover info
        const mqToggles = info.querySelectorAll('.dev-toolkit-mq-toggle');
        mqToggles.forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const parent = btn.closest('.dev-toolkit-mq');
                if (!parent) return;
                if (parent.classList.contains('expanded')) {
                    parent.classList.remove('expanded');
                    btn.textContent = 'Show more';
                } else {
                    parent.classList.add('expanded');
                    btn.textContent = 'Show less';
                }
            });
        });
    }

    // Setup double-click editable CSS values (like browser DevTools)
    // setupDoubleClickEditableCSS removed - use Live CSS Editor text box in popup instead
    
    // Enter double-click edit mode
    // Inline double-click editing removed - use Live CSS Editor text box in popup instead
    
    // Apply inline CSS property change
    // applyInlineCSS removed - use Live CSS Editor text box in popup instead

    // Setup inline editable element with hover and click behavior
    // setupInlineEditableElement removed - use Live CSS Editor text box in popup instead

    // enterInlineEditMode removed - use Live CSS Editor text box in popup instead

    // Apply property changes to the inspected element
    function applyPropertyChange(element, property, value) {
        try {
            if (property === 'className') {
                element.className = value;
            } else if (property === 'id') {
                element.id = value;
            } else {
                // Apply any CSS property
                // Convert camelCase to kebab-case if needed
                let cssProperty = property;
                if (property.includes('-')) {
                    // Already in kebab-case, convert to camelCase for element.style
                    cssProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                }
                
                // Apply with !important to ensure it takes effect
                element.style.setProperty(cssProperty, value, 'important');
                console.log('Applied:', cssProperty, '=', value);
            }
            showToast(`✓ Updated ${property} to "${value}"`);
        } catch (err) {
            console.error('Error in applyPropertyChange:', err);
            showToast(`✗ Failed to update ${property}`);
        }
    }

    // Extract relevant information about an element for display
    function getElementInfo(element, computedStyle) {
        const rect = element.getBoundingClientRect();

        return {
            _element: element,
            tagName: element.tagName.toLowerCase(),
            className: element.className || 'none',
            id: element.id || 'none',
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            color: computedStyle.color,
            backgroundColor: computedStyle.backgroundColor,
            fontFamily: computedStyle.fontFamily.split(',')[0].replace(/['"]/g, ''),
            fontSize: computedStyle.fontSize,
            fontWeight: computedStyle.fontWeight,
            lineHeight: computedStyle.lineHeight,
            margin: computedStyle.margin,
            padding: computedStyle.padding,
            display: computedStyle.display,
            position: computedStyle.position,
            objectFit: computedStyle.objectFit,
            borderRadius: computedStyle.borderRadius,
            opacity: computedStyle.opacity,
            flexDirection: computedStyle.flexDirection,
            justifyContent: computedStyle.justifyContent,
            alignItems: computedStyle.alignItems,
            fill: computedStyle.fill,
            stroke: computedStyle.stroke,
            textAlign: computedStyle.textAlign
        };
    }

    // Determine which properties are editable based on element type
    function getEditablePropertiesForElement(element) {
        const tag = element.tagName.toLowerCase();
        const editableProps = {
            common: ['color']
        };

        // TEXT ELEMENTS
        if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'li', 'label'].includes(tag)) {
            return {
                common: ['color'],
                specific: ['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'textAlign']
            };
        }

        // IMAGE ELEMENTS
        if (tag === 'img') {
            return {
                common: [],
                specific: ['width', 'height', 'objectFit', 'borderRadius', 'opacity']
            };
        }

        // BUTTON/INPUT ELEMENTS
        if (['button', 'input', 'textarea'].includes(tag)) {
            return {
                common: ['color'],
                specific: ['fontSize', 'fontWeight', 'padding', 'borderRadius']
            };
        }

        // SVG ELEMENTS
        if (['svg', 'path', 'circle', 'rect', 'line', 'polygon'].includes(tag)) {
            return {
                common: [],
                specific: ['width', 'height', 'fill', 'stroke']
            };
        }

        // CONTAINER ELEMENTS (default)
        if (['div', 'section', 'article', 'header', 'footer', 'nav', 'main'].includes(tag)) {
            return {
                common: ['color'],
                specific: ['display', 'padding', 'margin', 'flexDirection', 'justifyContent', 'alignItems']
            };
        }

        // FALLBACK: show basic properties for unknown elements
        return {
            ...editableProps,
            specific: ['fontSize', 'fontWeight', 'padding', 'margin']
        };
    }

    // Generate editor HTML for a specific property
    function generatePropertyControl(property, value, element) {
        const propLabel = property.charAt(0).toUpperCase() + property.slice(1).replace(/([A-Z])/g, ' $1');

        switch (property) {
            case 'color':
            case 'backgroundColor':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <div class="dev-toolkit-prop-controls">
                            <input type="color" class="dev-toolkit-color-input dev-toolkit-live-edit" data-property="${property}" value="${hexFromRgb(value)}">
                            <input type="text" class="dev-toolkit-text-input dev-toolkit-live-edit" data-property="${property}" value="${value}">
                        </div>
                    </div>
                `;

            case 'fontSize':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <div class="dev-toolkit-prop-controls">
                            <input type="range" class="dev-toolkit-slider dev-toolkit-live-edit" data-property="${property}" min="8" max="128" value="${parseFloat(value)}">
                            <input type="text" class="dev-toolkit-text-input dev-toolkit-live-edit" data-property="${property}" value="${value}" style="max-width: 60px;">
                        </div>
                    </div>
                `;

            case 'fontWeight':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <div class="dev-toolkit-prop-controls">
                            <input type="range" class="dev-toolkit-slider dev-toolkit-live-edit" data-property="${property}" min="100" max="900" step="100" value="${getFontWeightValue(value)}">
                            <input type="text" class="dev-toolkit-text-input dev-toolkit-live-edit" data-property="${property}" value="${value}" style="max-width: 60px;">
                        </div>
                    </div>
                `;

            case 'lineHeight':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <div class="dev-toolkit-prop-controls">
                            <input type="range" class="dev-toolkit-slider dev-toolkit-live-edit" data-property="${property}" min="0.5" max="3" step="0.1" value="${parseFloat(value)}">
                            <input type="text" class="dev-toolkit-text-input dev-toolkit-live-edit" data-property="${property}" value="${value}" style="max-width: 60px;">
                        </div>
                    </div>
                `;

            case 'fontFamily':
            case 'padding':
            case 'margin':
            case 'borderRadius':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <input type="text" class="dev-toolkit-text-input dev-toolkit-live-edit" data-property="${property}" value="${value}">
                    </div>
                `;

            case 'textAlign':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <select class="dev-toolkit-select dev-toolkit-live-edit" data-property="${property}">
                            <option value="left" ${value.includes('left') ? 'selected="selected"' : ''}>Left</option>
                            <option value="center" ${value.includes('center') ? 'selected="selected"' : ''}>Center</option>
                            <option value="right" ${value.includes('right') ? 'selected="selected"' : ''}>Right</option>
                            <option value="justify" ${value.includes('justify') ? 'selected="selected"' : ''}>Justify</option>
                        </select>
                    </div>
                `;

            case 'display':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <select class="dev-toolkit-select dev-toolkit-live-edit" data-property="${property}">
                            <option value="block" ${value.includes('block') ? 'selected="selected"' : ''}>Block</option>
                            <option value="inline" ${value === 'inline' ? 'selected="selected"' : ''}>Inline</option>
                            <option value="inline-block" ${value.includes('inline-block') ? 'selected="selected"' : ''}>Inline-Block</option>
                            <option value="flex" ${value.includes('flex') ? 'selected="selected"' : ''}>Flex</option>
                            <option value="grid" ${value.includes('grid') ? 'selected="selected"' : ''}>Grid</option>
                            <option value="none" ${value.includes('none') ? 'selected="selected"' : ''}>None</option>
                        </select>
                    </div>
                `;

            case 'flexDirection':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <select class="dev-toolkit-select dev-toolkit-live-edit" data-property="${property}">
                            <option value="row" ${value.includes('row') && !value.includes('reverse') ? 'selected="selected"' : ''}>Row</option>
                            <option value="column" ${value.includes('column') && !value.includes('reverse') ? 'selected="selected"' : ''}>Column</option>
                            <option value="row-reverse" ${value.includes('row-reverse') ? 'selected="selected"' : ''}>Row Reverse</option>
                            <option value="column-reverse" ${value.includes('column-reverse') ? 'selected="selected"' : ''}>Column Reverse</option>
                        </select>
                    </div>
                `;

            case 'justifyContent':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <select class="dev-toolkit-select dev-toolkit-live-edit" data-property="${property}">
                            <option value="flex-start" ${value.includes('flex-start') ? 'selected="selected"' : ''}>Flex Start</option>
                            <option value="center" ${value === 'center' ? 'selected="selected"' : ''}>Center</option>
                            <option value="flex-end" ${value.includes('flex-end') ? 'selected="selected"' : ''}>Flex End</option>
                            <option value="space-between" ${value.includes('space-between') ? 'selected="selected"' : ''}>Space Between</option>
                            <option value="space-around" ${value.includes('space-around') ? 'selected="selected"' : ''}>Space Around</option>
                        </select>
                    </div>
                `;

            case 'alignItems':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <select class="dev-toolkit-select dev-toolkit-live-edit" data-property="${property}">
                            <option value="flex-start" ${value.includes('flex-start') ? 'selected="selected"' : ''}>Flex Start</option>
                            <option value="center" ${value === 'center' ? 'selected="selected"' : ''}>Center</option>
                            <option value="flex-end" ${value.includes('flex-end') ? 'selected="selected"' : ''}>Flex End</option>
                            <option value="stretch" ${value.includes('stretch') ? 'selected="selected"' : ''}>Stretch</option>
                        </select>
                    </div>
                `;

            case 'opacity':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <div class="dev-toolkit-prop-controls">
                            <input type="range" class="dev-toolkit-slider dev-toolkit-live-edit" data-property="${property}" min="0" max="1" step="0.1" value="${parseFloat(value)}">
                            <input type="text" class="dev-toolkit-text-input dev-toolkit-live-edit" data-property="${property}" value="${value}" style="max-width: 60px;">
                        </div>
                    </div>
                `;

            case 'width':
            case 'height':
            case 'fill':
            case 'stroke':
            case 'objectFit':
                return `
                    <div class="dev-toolkit-prop-group">
                        <label class="dev-toolkit-prop-label">${propLabel}</label>
                        <input type="text" class="dev-toolkit-text-input dev-toolkit-live-edit" data-property="${property}" value="${value}">
                    </div>
                `;

            default:
                return '';
        }
    }

    // Format element information into HTML for the info panel
    function formatElementInfo(info) {
        let html = `
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Tag:</span>
                <strong>&lt;${info.tagName}&gt;</strong>
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Class:</span>
                <span class="dev-toolkit-editable" data-property="className">${escapeHtml(info.className)}</span>
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">ID:</span>
                <span class="dev-toolkit-editable" data-property="id">${escapeHtml(info.id)}</span>
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Size:</span>
                ${info.width}×${info.height}px
            </div>
        `;

        // If pinned, add interactive editor section with ONLY applicable properties
        if (toolkitState.pinnedElement && toolkitState.pinnedElement === info._element) {
            const editableProps = getEditablePropertiesForElement(info._element);
            const allProps = [...(editableProps.common || []), ...(editableProps.specific || [])];

            html += `<div class="dev-toolkit-editor-section"><div class="dev-toolkit-editor-title">Live Edit (Pinned)</div>`;

            // Render only applicable properties
            allProps.forEach(prop => {
                if (info[prop] !== undefined) {
                    html += generatePropertyControl(prop, info[prop], info._element);
                }
            });

            html += `
                <div class="dev-toolkit-editor-buttons">
                    <button class="dev-toolkit-apply-btn" id="dev-toolkit-apply-live">Apply</button>
                    <button class="dev-toolkit-reset-btn" id="dev-toolkit-reset-live">Reset</button>
                </div>
            </div>`;
        } else {
            // Hover mode - show basic CSS info
            html += `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="color: #66b3ff; font-weight: bold; margin-bottom: 8px; font-size: 11px;">CSS Properties:</div>
                    <div class="dev-toolkit-info-row">
                        <span class="dev-toolkit-info-label">Display:</span>
                        <span style="cursor: pointer; padding: 2px 6px; border-radius: 3px; background: rgba(255,255,255,0.05); user-select: none;">${info.display}</span>
                    </div>
                </div>
            `;
        }

        // Append matching media queries if enabled
        if (toolkitState.inspectorOptions && toolkitState.inspectorOptions.showMediaQueries) {
            const mq = getMatchingMediaQueries();
            if (mq && mq.length) {
                const combined = mq.join('\n\n');
                const safe = escapeHtml(combined);
                html += `<div class="dev-toolkit-info-row"><span class="dev-toolkit-info-label">Media:</span><div class="dev-toolkit-mq" data-mq-index="all"><div class="dev-toolkit-mq-preview">${safe}</div><button class="dev-toolkit-mq-toggle">Show more</button></div></div>`;
            }
        }

        return html;
    }

    // Return an array of media query condition texts that currently match the viewport
    function getMatchingMediaQueries() {
        const matches = [];
        for (const sheet of document.styleSheets) {
            let rules;
            try { rules = sheet.cssRules; } catch (e) { continue; }
            if (!rules) continue;
            for (const r of rules) {
                // MEDIA_RULE constant value
                if (r.type === CSSRule.MEDIA_RULE) {
                    try {
                        if (window.matchMedia(r.conditionText).matches) {
                            matches.push(r.conditionText);
                        }
                    } catch (e) { /* ignore malformed mediaText */ }
                }
            }
        }
        return matches;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function hexFromRgb(rgb) {
        if (rgb.startsWith('#')) return rgb;
        const result = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(rgb);
        if (!result) return '#000000';
        return '#' +
            ('0' + parseInt(result[1], 10).toString(16)).slice(-2) +
            ('0' + parseInt(result[2], 10).toString(16)).slice(-2) +
            ('0' + parseInt(result[3], 10).toString(16)).slice(-2);
    }

    function getFontWeightValue(fontWeight) {
        const map = { 'normal': 400, 'bold': 700, 'bolder': 900, 'lighter': 100 };
        const num = parseInt(fontWeight);
        return isNaN(num) ? (map[fontWeight] || 400) : num;
    }

    // --- Live edit state helpers ---
    // Keep original inline values for properties we change, so we can restore them later
    const originalInlineMap = new WeakMap(); // Element -> Map(prop -> originalInlineValue)
    const appliedPropsMap = new WeakMap();   // Element -> Set(prop)

    function parseCssText(cssText) {
        const map = new Map();
        if (!cssText) return map;
        cssText.split(';').forEach(part => {
            const kv = part.split(':');
            if (kv.length < 2) return;
            const prop = kv[0].trim();
            const val = kv.slice(1).join(':').trim();
            if (prop) map.set(prop, val);
        });
        return map;
    }

    function applyStylesToElement(el, cssText) {
        if (!el) return;
        const newMap = parseCssText(cssText);
        const appliedSet = appliedPropsMap.get(el) || new Set();
        const originalMap = originalInlineMap.get(el) || new Map();

        // Apply/overwrite properties present in newMap
        newMap.forEach((val, prop) => {
            // Save original inline value first time we touch this prop
            if (!originalMap.has(prop)) {
                const origInline = el.style.getPropertyValue(prop) || '';
                originalMap.set(prop, origInline);
            }
            try {
                el.style.setProperty(prop, val);
            } catch (e) {
                // ignore invalid properties
            }
            appliedSet.add(prop);
        });

        // For previously applied props that are no longer in newMap, restore
        const removed = Array.from(appliedSet).filter(p => !newMap.has(p));
        removed.forEach(prop => {
            const origInline = originalMap.get(prop);
            if (origInline !== undefined && origInline !== null && origInline !== '') {
                // restore previous inline value
                el.style.setProperty(prop, origInline);
            } else {
                // remove inline prop to revert to stylesheet/computed value
                el.style.removeProperty(prop);
            }
            appliedSet.delete(prop);
            // remove original recording for this prop
            originalMap.delete(prop);
        });

        // Persist maps
        if (originalMap.size) originalInlineMap.set(el, originalMap);
        else originalInlineMap.delete(el);

        if (appliedSet.size) appliedPropsMap.set(el, appliedSet);
        else appliedPropsMap.delete(el);
    }

    function clearStylesForElement(el) {
        if (!el) return;
        const appliedSet = appliedPropsMap.get(el);
        const originalMap = originalInlineMap.get(el);
        if (appliedSet) {
            appliedSet.forEach(prop => {
                const origInline = originalMap && originalMap.get(prop);
                if (origInline !== undefined && origInline !== null && origInline !== '') {
                    el.style.setProperty(prop, origInline);
                } else {
                    el.style.removeProperty(prop);
                }
            });
            appliedPropsMap.delete(el);
        }
        if (originalMap) originalInlineMap.delete(el);
    }

    function handleInspectorClick(e) {
        // Allow clicking the info panel controls when pinned — do not prevent default in that case
        const clicked = document.elementFromPoint(e.clientX, e.clientY);
        if (!clicked) return;

        // If clicking inside the info panel and we have a pinned element, allow normal behavior
        if (clicked.closest && clicked.closest('.dev-toolkit-info') && toolkitState.pinnedElement) {
            return; // let buttons/inputs inside info panel handle the event
        }

        // For other clicks (on page elements), prevent default browser actions and stop propagation
        e.preventDefault();
        e.stopPropagation();

        const element = e.target;
        if (!element || element.classList.contains('dev-toolkit-overlay') || element.classList.contains('dev-toolkit-crosshair')) return;

        // Toggle pin on the clicked element. If already pinned, unpin. If not, pin it.
        if (toolkitState.pinnedElement === element) {
            // Unpin
            toolkitState.pinnedElement = null;
            showToast('Element unpinned');
            // Restore info panel to ephemeral mode
            const info = document.querySelector('.dev-toolkit-info');
            if (info) info.classList.remove('pinned');
            try {
                chrome.runtime.sendMessage({ action: 'elementUnselected' });
            } catch (err) {
                // ignore
            }
            // Remove selected overlay if present
            const selOverlay = document.querySelector('.dev-toolkit-selected-overlay');
            if (selOverlay && selOverlay.parentNode) selOverlay.parentNode.removeChild(selOverlay);
        } else {
            // Clear styles for the previously pinned element
            if (toolkitState.pinnedElement) {
                clearStylesForElement(toolkitState.pinnedElement);
            }
            toolkitState.pinnedElement = element;
            showToast('Element pinned for editing');
            // Make info panel interactive so user can type and click Apply
            const info = document.querySelector('.dev-toolkit-info');
            if (info) info.classList.add('pinned');

            // Also update the overlay/info immediately for the pinned element
            const overlay = document.querySelector('.dev-toolkit-overlay');
            if (overlay) {
                const rect = element.getBoundingClientRect();
                overlay.style.left = rect.left + 'px';
                overlay.style.top = rect.top + 'px';
                overlay.style.width = rect.width + 'px';
                overlay.style.height = rect.height + 'px';
                overlay.style.display = 'block';
            }
            // Create / update selected overlay with a distinct style
            try {
                const selOverlay = createSelectedOverlayElement();
                const rect2 = element.getBoundingClientRect();
                selOverlay.style.left = rect2.left + 'px';
                selOverlay.style.top = rect2.top + 'px';
                selOverlay.style.width = rect2.width + 'px';
                selOverlay.style.height = rect2.height + 'px';
                selOverlay.style.display = 'block';
            } catch (err) {
                // ignore
            }
            const computedStyle = window.getComputedStyle(element);
            const elementInfo = getElementInfo(element, computedStyle);
            const infoEl = document.querySelector('.dev-toolkit-info');
            if (infoEl) {
                // Position info panel above the mouse cursor
                let infoX = e.clientX + 12;
                let infoY = e.clientY - 300 - 12; // Position above cursor (300 is approximate height)

                // Get popup dimensions (measure dynamically)
                const infoWidth = 280;
                const infoHeight = 300; // Approximate height, could be measured if needed

                // If not enough space above, position below cursor
                if (infoY < 0) {
                    infoY = e.clientY + 12;
                }

                // Prevent info panel from going off-screen horizontally
                if (infoX + infoWidth > window.innerWidth) {
                    infoX = Math.max(0, e.clientX - infoWidth - 12);
                }

                // Ensure vertical positioning stays within viewport
                if (infoY < 0) {
                    infoY = 0;
                } else if (infoY + infoHeight > window.innerHeight) {
                    infoY = window.innerHeight - infoHeight;
                }

                infoEl.style.left = infoX + 'px';
                infoEl.style.top = infoY + 'px';
                infoEl.style.display = 'block';
                infoEl.innerHTML = formatElementInfo(elementInfo);

                // Wire up pinned editor controls
                wireUpPinnedEditor(infoEl, element);
                // Notify popup about selected element and its info
                try {
                    chrome.runtime.sendMessage({ action: 'elementSelected', info: elementInfo });
                } catch (err) {
                    // ignore
                }
            }
        }
    }

    function wireUpPinnedEditor(infoEl, element) {
        const applyBtn = infoEl.querySelector('#dev-toolkit-apply-live');
        const resetBtn = infoEl.querySelector('#dev-toolkit-reset-live');
        const liveEditInputs = infoEl.querySelectorAll('.dev-toolkit-live-edit');

        // Collect property-to-input mapping (handle multiple inputs per property)
        const propertyMap = new Map();
        liveEditInputs.forEach(input => {
            const prop = input.dataset.property;
            if (!propertyMap.has(prop)) {
                propertyMap.set(prop, []);
            }
            propertyMap.get(prop).push(input);
        });

        // CSS property name map for converting to kebab-case
        const cssPropertyMap = {
            'backgroundColor': 'background-color',
            'fontSize': 'font-size',
            'fontFamily': 'font-family',
            'fontWeight': 'font-weight',
            'lineHeight': 'line-height',
            'textAlign': 'text-align',
            'borderRadius': 'border-radius',
            'flexDirection': 'flex-direction',
            'justifyContent': 'justify-content',
            'alignItems': 'align-items',
            'objectFit': 'object-fit'
        };

        // Sync color pickers and text inputs
        propertyMap.forEach((inputs, property) => {
            if (property === 'color' || property === 'backgroundColor') {
                const colorInput = inputs.find(i => i.type === 'color');
                const textInput = inputs.find(i => i.type === 'text');
                
                if (colorInput && textInput) {
                    colorInput.addEventListener('input', () => {
                        textInput.value = colorInput.value;
                    });
                    textInput.addEventListener('input', () => {
                        if (textInput.value.startsWith('#')) {
                            colorInput.value = textInput.value;
                        }
                    });
                }
            } else if (['fontSize', 'fontWeight', 'lineHeight', 'opacity'].includes(property)) {
                // Properties with sliders + text inputs
                const slider = inputs.find(i => i.type === 'range');
                const textInput = inputs.find(i => i.type === 'text');
                
                if (slider && textInput) {
                    slider.addEventListener('input', () => {
                        let displayValue = slider.value;
                        if (property === 'fontSize') {
                            displayValue += 'px';
                        }
                        textInput.value = displayValue;
                    });
                    
                    textInput.addEventListener('input', () => {
                        const val = parseFloat(textInput.value);
                        if (!isNaN(val)) {
                            slider.value = val;
                        }
                    });
                }
            }
        });

        // Apply button handler
        if (applyBtn) {
            applyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const changes = {};
                propertyMap.forEach((inputs, property) => {
                    let value;

                    if (['color', 'backgroundColor'].includes(property)) {
                        const colorInput = inputs.find(i => i.type === 'color');
                        value = colorInput ? colorInput.value : inputs[0].value;
                    } else if (['fontSize', 'fontWeight', 'lineHeight', 'opacity'].includes(property)) {
                        const textInput = inputs.find(i => i.type === 'text');
                        value = textInput ? textInput.value : inputs[0].value;
                    } else if (inputs[0].tagName === 'SELECT') {
                        value = inputs[0].value;
                    } else {
                        value = inputs[0].value;
                    }
                    
                    if (value) {
                        changes[property] = value;
                    }
                });

                applyPropertiesToElement(element, changes);
                showToast('✓ Changes applied');
            });
        }

        // Reset button handler
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Clear all properties that were edited
                propertyMap.forEach((inputs, property) => {
                    const cssProp = cssPropertyMap[property] || property;
                    element.style.removeProperty(cssProp);
                });

                showToast('✕ Changes reset');
                
                // Refresh the info panel
                const computedStyle = window.getComputedStyle(element);
                const elementInfo = getElementInfo(element, computedStyle);
                infoEl.innerHTML = formatElementInfo(elementInfo);
                wireUpPinnedEditor(infoEl, element);
            });
        }
    }

    function applyPropertiesToElement(element, changes) {
        const cssPropertyMap = {
            'color': 'color',
            'backgroundColor': 'background-color',
            'fontSize': 'font-size',
            'fontFamily': 'font-family',
            'fontWeight': 'font-weight',
            'lineHeight': 'line-height',
            'textAlign': 'text-align',
            'padding': 'padding',
            'margin': 'margin',
            'borderRadius': 'border-radius',
            'opacity': 'opacity',
            'width': 'width',
            'height': 'height',
            'display': 'display',
            'flexDirection': 'flex-direction',
            'justifyContent': 'justify-content',
            'alignItems': 'align-items',
            'objectFit': 'object-fit',
            'fill': 'fill',
            'stroke': 'stroke'
        };

        // Preserve computed background before applying changes to prevent currentColor issues
        let preservedBackground = null;
        if ('color' in changes) {
            const computedBg = window.getComputedStyle(element).backgroundColor;
            if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent') {
                preservedBackground = computedBg;
            }
        }

        Object.entries(changes).forEach(([prop, value]) => {
            try {
                const cssProp = cssPropertyMap[prop] || prop;

                if (value === null || value === undefined || value === '' ||
                    (prop === 'backgroundColor' && (value === 'transparent' || value === 'rgba(0,0,0,0)' || value === 'rgba(0, 0, 0, 0)'))) {
                    // Remove the property
                    element.style.removeProperty(cssProp);
                } else {
                    // Add units where needed
                    let finalValue = value;
                    if (prop === 'fontSize' && value && !value.toString().match(/px|em|rem|%/)) {
                        finalValue = value + 'px';
                    } else if ((prop === 'width' || prop === 'height') && value && !value.toString().match(/px|em|rem|%|auto|inherit|initial/)) {
                        finalValue = value + 'px';
                    } else if (prop === 'padding' && value && !value.toString().match(/px|em|rem|%/)) {
                        finalValue = value + 'px';
                    } else if (prop === 'margin' && value && !value.toString().match(/px|em|rem|%/)) {
                        finalValue = value + 'px';
                    }

                    element.style.setProperty(cssProp, finalValue, 'important');
                }
            } catch (err) {
                // ignore invalid properties
            }
        });

        // Restore preserved background after color change
        if (preservedBackground) {
            element.style.setProperty('background-color', preservedBackground, 'important');
        }
    }

    function handleInspectorKeyboard(e) {
        if (e.key === 'Escape') {
            deactivateInspector();
        }
    }

    function generateSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.className) {
            const classes = element.className.split(' ').filter(c => c && !c.startsWith('dev-toolkit'));
            if (classes.length > 0) {
                return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
            }
        }
        
        return element.tagName.toLowerCase();
    }

    // Global array to track active color picker popups
    const colorPickerPopups = [];

// Utility function to convert rgb/rgba string to hex
    function rgbToHex(rgb) {
        const result = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(rgb);
        return result ? "#" +
            ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
            ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
            ("0" + parseInt(result[3], 10).toString(16)).slice(-2) : rgb;
    }

    // Magnifier element reference
    let magnifierElement = null;
    let magnifierCanvas = null;
    let magnifierCtx = null;
    let magnifierHiddenCanvas = null;
    let magnifierHiddenCtx = null;
    const MAGNIFIER_SIZE = 40;
    const MAGNIFIER_ZOOM = 1;
    const CAPTURE_SIZE = 1;

    // Create the magnifier element
    function createMagnifierElement() {
        if (magnifierElement) return magnifierElement;

        magnifierElement = document.createElement('div');
        magnifierElement.className = 'dev-toolkit-magnifier';
        magnifierElement.style.display = 'none';

        // Create canvas for zoomed view
        magnifierCanvas = document.createElement('canvas');
        magnifierCanvas.className = 'dev-toolkit-magnifier-canvas';
        magnifierCanvas.width = MAGNIFIER_SIZE;
        magnifierCanvas.height = MAGNIFIER_SIZE;
        magnifierCtx = magnifierCanvas.getContext('2d', { willReadFrequently: true });
        magnifierElement.appendChild(magnifierCanvas);

        // Create crosshair
        const crosshair = document.createElement('div');
        crosshair.className = 'dev-toolkit-magnifier-crosshair';
        magnifierElement.appendChild(crosshair);

        // Create color info display
        const colorInfo = document.createElement('div');
        colorInfo.className = 'dev-toolkit-magnifier-color-info';
        
        const swatch = document.createElement('div');
        swatch.className = 'dev-toolkit-magnifier-color-swatch';
        swatch.id = 'dev-toolkit-magnifier-swatch';
        
        const hexText = document.createElement('span');
        hexText.id = 'dev-toolkit-magnifier-hex';
        
        colorInfo.appendChild(swatch);
        colorInfo.appendChild(hexText);
        magnifierElement.appendChild(colorInfo);

        // Create hidden canvas for capturing page content
        magnifierHiddenCanvas = document.createElement('canvas');
        magnifierHiddenCanvas.width = CAPTURE_SIZE;
        magnifierHiddenCanvas.height = CAPTURE_SIZE;
        magnifierHiddenCtx = magnifierHiddenCanvas.getContext('2d', { willReadFrequently: true });

        document.body.appendChild(magnifierElement);
        return magnifierElement;
    }

    // Update magnifier position and content
    function updateMagnifier(x, y) {
        if (!magnifierElement) {
            createMagnifierElement();
        }

        // Position magnifier (offset from cursor to avoid obstruction)
        let magX = x + 25;
        let magY = y + 25;

        // Keep magnifier in viewport
        const magnifierWidth = MAGNIFIER_SIZE + 40; // Include color info height
        const magnifierHeight = MAGNIFIER_SIZE + 40;
        
        if (magX + MAGNIFIER_SIZE > window.innerWidth) {
            magX = x - 25 - MAGNIFIER_SIZE;
        }
        if (magY + magnifierHeight > window.innerHeight) {
            magY = y - 25 - magnifierHeight;
        }

        magnifierElement.style.left = magX + 'px';
        magnifierElement.style.top = magY + 'px';
        magnifierElement.style.display = 'block';

        // Sample color and update magnifier content
        updateMagnifierContent(x, y);
    }

    // Capture a portion of the page around cursor position
    function capturePageArea(centerX, centerY) {
        try {
            // Get the scroll-adjusted coordinates
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            const pageX = centerX + scrollX;
            const pageY = centerY + scrollY;
            
            // Use SVG to capture the page area
            const svgWidth = CAPTURE_SIZE;
            const svgHeight = CAPTURE_SIZE;
            
            // Create an SVG foreignObject to capture the page area
            const svgXml = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
                    <foreignObject width="100%" height="100%">
                        <div xmlns="http://www.w3.org/1999/xhtml" style="
                            width: ${svgWidth}px;
                            height: ${svgHeight}px;
                            overflow: hidden;
                            transform: translate(-${centerX - CAPTURE_SIZE/2}px, -${centerY - CAPTURE_SIZE/2}px);
                        ">
                        </div>
                    </foreignObject>
                </svg>
            `;
            
            // Since we can't easily capture the actual page content without html2canvas,
            // we'll create a visual effect using the sampled colors
            return createMagnifierVisualEffect(centerX, centerY);
        } catch (e) {
            console.log('Capture error:', e);
            return null;
        }
    }

    // Create a visual zoom effect using sampled colors
    function createMagnifierVisualEffect(cursorX, cursorY) {
        if (!magnifierCtx || !magnifierHiddenCtx) return null;
        
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const pageX = cursorX + scrollX;
        const pageY = cursorY + scrollY;
        
        // Sample colors in a grid around the cursor
        const gridSize = 4; // Sample 4x4 grid
        const step = 6; // 6px apart
        const colors = [];
        
        for (let dy = -gridSize/2; dy < gridSize/2; dy++) {
            for (let dx = -gridSize/2; dx < gridSize/2; dx++) {
                const sampleX = cursorX + dx * step;
                const sampleY = cursorY + dy * step;
                const color = sampleColorAtPosition(sampleX + scrollX, sampleY + scrollY);
                colors.push(color || '#ffffff');
            }
        }
        
        // Draw the sampled colors as a zoomed grid
        magnifierCtx.imageSmoothingEnabled = false;
        
        const cellSize = MAGNIFIER_SIZE / gridSize;
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const colorIndex = row * gridSize + col;
                magnifierCtx.fillStyle = colors[colorIndex] || '#cccccc';
                magnifierCtx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
        
        // Draw grid lines
        magnifierCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        magnifierCtx.lineWidth = 1;
        for (let i = 0; i <= gridSize; i++) {
            magnifierCtx.beginPath();
            magnifierCtx.moveTo(i * cellSize, 0);
            magnifierCtx.lineTo(i * cellSize, MAGNIFIER_SIZE);
            magnifierCtx.stroke();
            magnifierCtx.beginPath();
            magnifierCtx.moveTo(0, i * cellSize);
            magnifierCtx.lineTo(MAGNIFIER_SIZE, i * cellSize);
            magnifierCtx.stroke();
        }
        
        // Draw center crosshair
        magnifierCtx.strokeStyle = '#ff0000';
        magnifierCtx.lineWidth = 2;
        const center = MAGNIFIER_SIZE / 2;
        
        // Horizontal line
        magnifierCtx.beginPath();
        magnifierCtx.moveTo(center - 10, center);
        magnifierCtx.lineTo(center + 10, center);
        magnifierCtx.stroke();
        
        // Vertical line
        magnifierCtx.beginPath();
        magnifierCtx.moveTo(center, center - 10);
        magnifierCtx.lineTo(center, center + 10);
        magnifierCtx.stroke();
        
        // Draw center circle
        magnifierCtx.beginPath();
        magnifierCtx.arc(center, center, 4, 0, Math.PI * 2);
        magnifierCtx.strokeStyle = '#ff0000';
        magnifierCtx.stroke();
        
        return colors[Math.floor(gridSize * gridSize / 2)]; // Return center color
    }

    // Update the zoomed content in the magnifier
    function updateMagnifierContent(cursorX, cursorY) {
        if (!magnifierCtx) return;

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Get color at cursor position and create visual zoom effect
        const color = createMagnifierVisualEffect(cursorX, cursorY) || sampleColorAtPosition(cursorX + scrollX, cursorY + scrollY);
        
        if (color) {
            const hex = rgbToHex(color).toUpperCase();
            
            const swatch = document.getElementById('dev-toolkit-magnifier-swatch');
            const hexText = document.getElementById('dev-toolkit-magnifier-hex');
            if (swatch) swatch.style.backgroundColor = color;
            if (hexText) hexText.textContent = hex;
        }
    }

    // Enhanced color sampling from any position on the page
    // Focuses on picking colors from visible top-layer elements only
    function sampleColorAtPosition(pageX, pageY) {
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const viewportX = pageX - scrollX;
        const viewportY = pageY - scrollY;
        
        // Get the element at the cursor position
        const element = document.elementFromPoint(viewportX, viewportY);
        if (!element) return null;
        
        let color = null;
        
        // 1. First, check if element is an image - use viewport coordinates for sampling
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'img' || tagName === 'video' || tagName === 'picture') {
            let targetEl = element;
            if (tagName === 'picture') targetEl = element.querySelector('img');
            if (targetEl) color = sampleImageColor(targetEl, viewportX, viewportY);
        }
        
        // 2. Check for canvas element - use viewport coordinates
        if (!color && tagName === 'canvas') {
            color = getColorFromCanvas(element, viewportX, viewportY);
        }
        
        // 3. Check for SVG element
        if (!color && (tagName === 'svg' || element.closest('svg'))) {
            color = getColorFromSVG(element, viewportX, viewportY);
        }
        
        // 4. Check for background images on any element - use page coordinates
        if (!color) {
            const style = window.getComputedStyle(element);
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none' && !bgImage.includes('gradient')) {
                // Extract URL from background-image
                const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
                if (urlMatch && urlMatch[1]) {
                    color = sampleBackgroundImageColor(element, urlMatch[1], pageX, pageY);
                }
            }
        }
        
        // 5. Try to get from computed style (CSS colors)
        if (!color) {
            color = getElementColor(element);
            // If element itself has no color, check parent elements
            if (!color) {
                let parent = element.parentElement;
                let depth = 0;
                const maxDepth = 10; // Limit parent traversal
                while (parent && !color && depth < maxDepth) {
                    color = getElementColor(parent);
                    parent = parent.parentElement;
                    depth++;
                }
            }
        }
        
        return color;
    }
    
    // Sample color from background-image (synchronous using CORS)
    function sampleBackgroundImageColor(element, bgUrl, pageX, pageY) {
        try {
            // Create a temporary image to load the background
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            // Try to load the image
            let src = bgUrl;
            if (!bgUrl.startsWith('data:') && !bgUrl.startsWith('http')) {
                src = new URL(bgUrl, window.location.href).href;
            }
            img.src = src;
            
            // Check if image is already loaded
            if (img.complete && img.naturalWidth > 0) {
                return getColorFromImage(img, element, pageX, pageY);
            }
            
            // If not loaded yet, try using computed style - check for solid colors first
            const style = window.getComputedStyle(element);
            const bgColor = style.backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                return bgColor;
            }
            
            // For async loading, we'll return null and let the caller handle it
            return null;
        } catch (e) {
            return null;
        }
    }
    
    // Helper to get color from loaded image
    function getColorFromImage(img, element, pageX, pageY) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            ctx.drawImage(img, 0, 0);
            
            // Get element's background position and size
            const style = window.getComputedStyle(element);
            const bgSize = style.backgroundSize;
            const rect = element.getBoundingClientRect();
            
            // Parse background-size
            let bgWidth = img.naturalWidth;
            let bgHeight = img.naturalHeight;
            
            if (bgSize === 'cover') {
                const ratio = Math.max(rect.width / bgWidth, rect.height / bgHeight);
                bgWidth = rect.width / ratio;
                bgHeight = rect.height / ratio;
            } else if (bgSize === 'contain') {
                const ratio = Math.min(rect.width / bgWidth, rect.height / bgHeight);
                bgWidth = bgWidth * ratio;
                bgHeight = bgHeight * ratio;
            } else if (bgSize !== 'auto') {
                const sizeParts = bgSize.split(' ');
                if (sizeParts[0] !== 'auto') {
                    bgWidth = parseFloat(sizeParts[0]) || img.naturalWidth;
                }
                if (sizeParts[1] !== 'auto') {
                    bgHeight = parseFloat(sizeParts[1]) || img.naturalHeight;
                }
            }
            
            // Calculate position within the background image
            const relX = (pageX - rect.left) / rect.width;
            const relY = (pageY - rect.top) / rect.height;
            
            // Calculate actual pixel position in the image
            let imgX = relX * bgWidth;
            let imgY = relY * bgHeight;
            
            // Clamp to image bounds
            imgX = Math.max(0, Math.min(imgX, img.naturalWidth - 1));
            imgY = Math.max(0, Math.min(imgY, img.naturalHeight - 1));
            
            const pixel = ctx.getImageData(Math.floor(imgX), Math.floor(imgY), 1, 1).data;
            if (pixel[3] > 0) {
                return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
            }
            
            return null;
        } catch (e) {
            return null;
        }
    }

    // Get color from canvas element
    function getColorFromCanvas(canvas, pageX, pageY) {
        try {
            const ctx = canvas.getContext('2d');
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((pageX - rect.left) * (canvas.width / rect.width));
            const y = Math.floor((pageY - rect.top) * (canvas.height / rect.height));
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            if (pixel[3] > 0) {
                return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
            }
        } catch (e) {
            // May fail due to cross-origin
        }
        return null;
    }

    // Get color from SVG element
    function getColorFromSVG(svgElement, pageX, pageY) {
        try {
            let svg = svgElement.closest('svg');
            if (!svg) return null;
            
            const fill = svg.getAttribute('fill');
            if (fill && fill !== 'none' && fill !== 'transparent') {
                return fill;
            }
            
            const stroke = svg.getAttribute('stroke');
            if (stroke && stroke !== 'none' && stroke !== 'transparent') {
                return stroke;
            }
            
            const computed = window.getComputedStyle(svg);
            if (computed.fill && computed.fill !== 'none' && computed.fill !== 'transparent') {
                return computed.fill;
            }
        } catch (e) {
            // Ignore errors
        }
        return null;
    }

    // Function to sample color from an image at specific viewport coordinates
    function sampleImageColor(img, viewportX, viewportY) {
        try {
            // Check if image has valid dimensions
            if (!img.naturalWidth || !img.naturalHeight) {
                // Try using offset dimensions as fallback
                if (!img.offsetWidth || !img.offsetHeight) {
                    return null;
                }
            }
            
            const rect = img.getBoundingClientRect();
            
            // Check if click is within image bounds
            if (viewportX < rect.left || viewportX > rect.right || 
                viewportY < rect.top || viewportY > rect.bottom) {
                return null;
            }
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            const width = img.naturalWidth || img.offsetWidth;
            const height = img.naturalHeight || img.offsetHeight;
            
            canvas.width = width;
            canvas.height = height;
            
            // Try to draw the image to canvas
            try {
                ctx.drawImage(img, 0, 0, width, height);
            } catch (drawError) {
                // If drawing fails (CORS issue), try alternative approaches
                // Try to get color from computed style background
                const computed = window.getComputedStyle(img);
                if (computed.backgroundColor && computed.backgroundColor !== 'transparent' && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    return computed.backgroundColor;
                }
                
                // Try to get from src directly if it's a same-origin image
                if (img.src && !img.src.startsWith('data:') && img.src.startsWith(window.location.origin)) {
                    // Create a proxy approach - try loading image directly
                    try {
                        const tempImg = new Image();
                        tempImg.src = img.src;
                        if (tempImg.complete) {
                            ctx.drawImage(tempImg, 0, 0, width, height);
                        }
                    } catch (e) {
                        // Still can't access
                    }
                }
                
                // Last resort - check if element has any color
                const fallbackColor = getComputedStyleForImage(img);
                if (fallbackColor) return fallbackColor;
                
                return null;
            }

            const scaleX = width / rect.width;
            const scaleY = height / rect.height;
            const imgX = Math.floor((viewportX - rect.left) * scaleX);
            const imgY = Math.floor((viewportY - rect.top) * scaleY);
            
            // Clamp to valid range
            const clampedX = Math.max(0, Math.min(imgX, width - 1));
            const clampedY = Math.max(0, Math.min(imgY, height - 1));

            const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
            
            // Check if pixel has any color (alpha > 0)
            if (pixel[3] === 0) {
                return null; // Transparent pixel
            }
            
            const r = pixel[0], g = pixel[1], b = pixel[2], a = pixel[3] / 255;

            return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})` : `rgb(${r}, ${g}, ${b})`;
        } catch (error) {
            console.error('Error sampling image color:', error);
            return null;
        }
    }
    
    // Helper to get computed color from image element
    function getComputedStyleForImage(img) {
        try {
            const style = window.getComputedStyle(img);
            
            // Check various color properties
            const colorProps = ['backgroundColor', 'color', 'borderBottomColor', 'borderTopColor', 'borderLeftColor', 'borderRightColor'];
            
            for (const prop of colorProps) {
                const value = style[prop];
                if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)' && value !== 'rgba(0,0,0,0)') {
                    return value;
                }
            }
            
            // Check inline styles
            const inlineColor = img.style.backgroundColor;
            if (inlineColor && inlineColor !== 'transparent' && inlineColor !== 'rgba(0, 0, 0, 0)') {
                return inlineColor;
            }
            
            return null;
        } catch (e) {
            return null;
        }
    }

    // Function to create a color picker popup element
    function createColorPickerPopup(x, y, color) {
        const popup = document.createElement('div');
        popup.className = 'dev-toolkit-color-popup';
        popup.style.left = (x + 10) + 'px';
        popup.style.top = (y + 10) + 'px';

        // Color swatch
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;

        // Color info container
        const info = document.createElement('div');
        info.className = 'color-info';

        // Hex code
        const hex = document.createElement('div');
        hex.className = 'color-hex';
        const hexValue = rgbToHex(color).toUpperCase();
        hex.textContent = hexValue;

        // Add click event to copy hex value
        hex.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(hexValue).then(() => {
                showToast(`Hex value copied: ${hexValue}`);
            }).catch(() => {
                showToast('Failed to copy hex value');
            });
        });

        // RGB code
        const rgb = document.createElement('div');
        rgb.className = 'color-rgb';
        rgb.textContent = color;

        info.appendChild(hex);
        info.appendChild(rgb);

        popup.appendChild(swatch);
        popup.appendChild(info);

        document.body.appendChild(popup);
        colorPickerPopups.push(popup);
    }

    // Function to close all color picker popups
    function closeAllColorPickerPopups() {
        while (colorPickerPopups.length > 0) {
            const popup = colorPickerPopups.pop();
            if (popup && popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }
    }

    // Store for tracking applied CSS changes
    let appliedCSSChanges = new Map();

    // Apply CSS property from live edit text box to all elements on the page
    // Helper function to send logs to popup console
    function logToPopupConsole(message) {
        try {
            chrome.runtime.sendMessage({
                action: 'logToPopupConsole',
                message: message
            }).catch(() => {
                // Popup might not be open, ignore
            });
        } catch (err) {
            // Ignore errors when popup is not open
        }
    }

    function applyLiveCSS(property, value) {
        try {
            // Normalize property name (convert kebab-case to camelCase)
            const normalizedProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

            // Get pinned element if available, otherwise all elements
            let elements = [];
            if (toolkitState.pinnedElement) {
                elements = [toolkitState.pinnedElement];
                logToPopupConsole(`Applying to pinned element: ${toolkitState.pinnedElement.tagName}`);
            } else {
                elements = Array.from(document.querySelectorAll('*'));
            }

            // Apply CSS to all elements using applyPropertiesToElement to preserve backgrounds
            let appliedCount = 0;
            const changes = { [normalizedProperty]: value };
            elements.forEach((element) => {
                try {
                    applyPropertiesToElement(element, changes);
                    appliedCount++;

                    // Track changes
                    if (!appliedCSSChanges.has(element)) {
                        appliedCSSChanges.set(element, []);
                    }
                    appliedCSSChanges.get(element).push({
                        property: property,
                        value: value,
                        originalValue: element.style.getPropertyValue(property)
                    });
                } catch (err) {
                    // Skip elements where CSS can't be applied
                }
            });

            if (appliedCount > 0) {
                const message = `✓ Applied "${property}: ${value}" to ${appliedCount} element${appliedCount > 1 ? 's' : ''}`;
                showToast(message);
                logToPopupConsole(message);
                console.log('Live CSS Applied:', property, '=', value, 'on', appliedCount, 'elements');
                return true;
            } else {
                const message = `✗ Failed to apply CSS to elements`;
                showToast(message);
                logToPopupConsole(message);
                return false;
            }
        } catch (error) {
            console.error('Error in applyLiveCSS:', error);
            const message = `✗ Invalid CSS: ${error.message}`;
            showToast(message);
            logToPopupConsole(message);
            return false;
        }
    }

    // Open color picker for a CSS color property
    function openColorPickerForProperty(element, property, currentColor, swatchElement) {
        console.log('openColorPickerForProperty called:', property, currentColor);
        
        // Create a hidden input element for the native color picker
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.display = 'none';
        colorInput.style.position = 'fixed';
        colorInput.style.pointerEvents = 'none';
        
        // Convert color to hex format if needed
        let hexColor = currentColor;
        if (currentColor.startsWith('rgb')) {
            // Parse rgb(r, g, b) to hex
            const rgbMatch = currentColor.match(/\d+/g);
            if (rgbMatch && rgbMatch.length >= 3) {
                const r = parseInt(rgbMatch[0]).toString(16).padStart(2, '0');
                const g = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
                const b = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
                hexColor = `#${r}${g}${b}`;
            }
        }
        
        colorInput.value = hexColor.startsWith('#') ? hexColor : '#000000';
        console.log('Color picker value set to:', colorInput.value);
        
        // Handle color selection - BEFORE adding to DOM
        const handleColorChange = (e) => {
            console.log('Color changed to:', e.target.value);
            const newColor = e.target.value;
            // Apply the color change
            applyInlineCSS(element, property, newColor);
            
            // Update the swatch
            swatchElement.style.background = newColor;
            
            // Update the text in the CSS value span
            const row = swatchElement.closest('.dev-toolkit-info-row');
            const colorSpan = row.querySelector('.dev-toolkit-css-value');
            if (colorSpan) {
                colorSpan.textContent = newColor;
            }
            
            // Clean up
            document.body.removeChild(colorInput);
        };
        
        const handleCancel = () => {
            console.log('Color picker cancelled');
            // Clean up
            if (document.body.contains(colorInput)) {
                document.body.removeChild(colorInput);
            }
        };
        
        colorInput.addEventListener('change', handleColorChange);
        colorInput.addEventListener('cancel', handleCancel);
        
        // Add to DOM and trigger the picker
        document.body.appendChild(colorInput);
        console.log('Color picker input element added to DOM');
        
        // Use setTimeout to ensure the element is in the DOM before clicking
        setTimeout(() => {
            console.log('Triggering color picker click');
            colorInput.click();
        }, 10);
    }

    // Clear all applied live CSS changes
    function clearAllLiveCSS() {
        try {
            // Revert all tracked changes
            appliedCSSChanges.forEach((changes, element) => {
                changes.forEach((change) => {
                    if (change.originalValue) {
                        element.style.setProperty(change.property, change.originalValue);
                    } else {
                        element.style.removeProperty(change.property);
                    }
                });
            });
            
            const clearedCount = appliedCSSChanges.size;
            appliedCSSChanges.clear();
            
            showToast(`✓ Cleared CSS changes from ${clearedCount} elements`);
        } catch (error) {
            console.error('Error in clearAllLiveCSS:', error);
            showToast(`✗ Error clearing CSS: ${error.message}`);
        }
    }

    // Helper function to get the best color from an element
    function getElementColor(element) {
        if (!element) return null;
        
        const computedStyle = window.getComputedStyle(element);
        
        // Check for gradient text (background-clip: text)
        try {
            const clip = computedStyle.backgroundClip || computedStyle.webkitBackgroundClip;
            const bg = computedStyle.backgroundImage;
            if ((clip === 'text') && bg && bg !== 'none' && bg.includes('gradient')) {
                const match = bg.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)/);
                if (match) return match[0];
            }
        } catch(e) {}
        
        // First, check inline styles directly (they take priority)
        const inlineBg = element.style.backgroundColor;
        if (inlineBg && inlineBg !== '' && inlineBg !== 'transparent' && inlineBg !== 'rgba(0, 0, 0, 0)') {
            return inlineBg;
        }
        
        const inlineColor = element.style.color;
        if (inlineColor && inlineColor !== '' && inlineColor !== 'transparent' && inlineColor !== 'rgba(0, 0, 0, 0)') {
            return inlineColor;
        }

        // Check if element has visible background (is a container/div-like element)
        const tagName = element.tagName.toLowerCase();
        const isContainerElement = ['div', 'span', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'body'].includes(tagName);
        
        // Check if element is an image or has no text content (should prioritize background)
        const hasTextContent = element.textContent && element.textContent.trim().length > 0;
        const hasChildWithContent = element.children && Array.from(element.children).some(child => {
            const childText = child.textContent || '';
            return childText.trim().length > 0;
        });
        
        // For container-like elements without text, prioritize backgroundColor
        // For elements with text, check both but be smarter about which to return
        let properties;
        
        // If it's a pure container element (like .color-sample divs), prioritize background
        if (isContainerElement && !hasTextContent && !hasChildWithContent) {
            properties = [
                'backgroundColor',
                'background',
                'borderTopColor',
                'borderRightColor',
                'borderBottomColor',
                'borderLeftColor',
                'borderColor',
                'color',
                'outlineColor',
                'boxShadow',
                'textShadow',
                'fill',
                'stroke',
                'stopColor',
                'floodColor',
                'lightingColor'
            ];
        } else {
            // For mixed content, prioritize backgroundColor first (most common use case)
            properties = [
                'backgroundColor',
                'background',
                'color',
                'borderTopColor',
                'borderRightColor',
                'borderBottomColor',
                'borderLeftColor',
                'borderColor',
                'outlineColor',
                'boxShadow',
                'textShadow',
                'fill',
                'stroke',
                'stopColor',
                'floodColor',
                'lightingColor'
            ];
        }

        const isValidColor = (value) => {
            if (!value) return false;
            const lowerValue = value.toLowerCase();
            return lowerValue !== 'rgba(0, 0, 0, 0)' && 
                   lowerValue !== 'transparent' && 
                   lowerValue !== 'none' && 
                   lowerValue !== 'currentcolor' && 
                   lowerValue !== 'inherit' && 
                   lowerValue !== 'initial' &&
                   lowerValue !== 'unset';
        };

        for (const prop of properties) {
            const value = computedStyle[prop];
            if (isValidColor(value)) {
                // For box-shadow and text-shadow, extract the first color
                if (prop === 'boxShadow' || prop === 'textShadow') {
                    const colorMatch = value.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/);
                    if (colorMatch) {
                        return colorMatch[0];
                    }
                } else if (prop === 'background' || prop === 'backgroundColor') {
                    // Handle background shorthand - check if it's a solid color
                    if (value.startsWith('rgb') || value.startsWith('#') || value.startsWith('hsl')) {
                        return value;
                    }
                    // For gradients, extract first color
                    if (value.includes('gradient')) {
                        const colorMatch = value.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/);
                        if (colorMatch) {
                            return colorMatch[0];
                        }
                    }
                } else {
                    return value;
                }
            }
        }

        // Check for gradients in backgroundImage
        const bgImage = computedStyle.backgroundImage;
        if (bgImage && bgImage !== 'none') {
            // Simple parsing: extract color values
            const colorMatches = bgImage.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g);
            if (colorMatches && colorMatches.length > 0) {
                return colorMatches[0]; // return first color
            }
        }

        // Check for CSS custom properties (variables) that might contain colors
        const allStyles = element.style;
        for (let i = 0; i < allStyles.length; i++) {
            const prop = allStyles[i];
            const value = allStyles.getPropertyValue(prop);
            if (value && (value.includes('#') || value.includes('rgb') || value.includes('hsl'))) {
                const colorMatch = value.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/);
                if (colorMatch) {
                    return colorMatch[0];
                }
            }
        }

        return null;
    }

    // Color picker functionality - popup on click
    // Improved to pick colors from visible top-layer elements including HTML, CSS, images, and media
    function activateColorPicker() {
        if (toolkitState.colorPickerActive) return;

        toolkitState.colorPickerActive = true;

        showToast('Color picker activated! Click anywhere to pick color from CSS, images, or media. Press ESC to close.');

        // Add mousemove handler to show magnifier
        const mouseMoveHandler = (e) => {
            updateMagnifier(e.clientX, e.clientY);
        };
        document.addEventListener('mousemove', mouseMoveHandler);

        const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore clicks on toolkit elements
            if (e.target.classList.contains('dev-toolkit-info') ||
                e.target.classList.contains('dev-toolkit-overlay') ||
                e.target.classList.contains('dev-toolkit-color-popup') ||
                e.target.classList.contains('dev-toolkit-magnifier') ||
                (e.target.closest && e.target.closest('.dev-toolkit-toast'))) {
                return;
            }

            // Use the enhanced sampleColorAtPosition function that handles:
            // 1. Images (<img> tags)
            // 2. Canvas elements
            // 3. SVG elements
            // 4. Background images
            // 5. CSS colors from elements
            // This picks from the visible top-layer element at cursor position
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            const pageX = e.clientX + scrollX;
            const pageY = e.clientY + scrollY;
            
            let color = sampleColorAtPosition(pageX, pageY);

            // Ensure we have a valid color string (rgb, rgba, or hex-like)
            if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
                showToast('No valid color found at this location. Try a different spot.');
                return;
            }

            // Save color to history (send to background script for storage)
            saveColorToHistory(color);

            // Copy color to clipboard (copy hex value instead of rgb)
            const hexColor = rgbToHex(color);
            navigator.clipboard.writeText(hexColor).then(() => {
                showToast(`Color picked and copied: ${hexColor}`);
            }).catch((err) => {
                console.error('Failed to copy color to clipboard:', err);
                showToast(`Color picked: ${hexColor} (copy manually)`);
            });

            // Create popup at click position
            createColorPickerPopup(e.clientX, e.clientY, color);
        };

// ESC key handler for closing all popups and deactivating color picker
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                deactivateColorPicker(mouseMoveHandler, clickHandler, keyHandler);
            }
        };

        // Attach event listeners
        document.addEventListener('click', clickHandler, true);
        document.addEventListener('keydown', keyHandler, true);

        // Store handlers for proper cleanup in deactivateColorPicker
        toolkitState.colorPickerHandlers = { mouseMoveHandler, clickHandler, keyHandler };

        // Store for cleanup (inspector compatibility)
        toolkitState.eventListeners.push(
            { element: document, event: 'mousemove', handler: mouseMoveHandler },
            { element: document, event: 'click', handler: clickHandler },
            { element: document, event: 'keydown', handler: keyHandler }
        );
    }

    // Proper deactivation function for color picker
    function deactivateColorPicker(handlers = null) {
        if (handlers === null) {
            handlers = toolkitState.colorPickerHandlers;
        }
        if (!handlers) return;

        const { mouseMoveHandler, clickHandler, keyHandler } = handlers;

        // Close all popups
        closeAllColorPickerPopups();

        // Remove all listeners
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('click', clickHandler, true);
        document.removeEventListener('keydown', keyHandler, true);

        // Hide and cleanup magnifier
        if (magnifierElement && magnifierElement.parentNode) {
            magnifierElement.style.display = 'none';
            magnifierElement.parentNode.removeChild(magnifierElement);
        }
        magnifierElement = null;
        magnifierCanvas = null;
        magnifierCtx = null;
        magnifierHiddenCanvas = null;
        magnifierHiddenCtx = null;

        // Reset cursor and state
        document.body.style.cursor = '';
        toolkitState.colorPickerActive = false;
        toolkitState.colorPickerHandlers = null;

        // Remove from global eventListeners if present (inspector compatibility)
        if (toolkitState.eventListeners) {
            toolkitState.eventListeners = toolkitState.eventListeners.filter(listener =>
                !(listener.handler === mouseMoveHandler || listener.handler === clickHandler || listener.handler === keyHandler)
            );
        }

        showToast('Color picker deactivated.');
    }

    function saveColorToHistory(color) {
        // Send color to background script for storage
        chrome.runtime.sendMessage({
            action: 'saveColor',
            color: color
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Error saving color:', chrome.runtime.lastError);
            }
        });
    }

    // Asset extraction functionality
    function extractAssets(filters = { includeImages: true, includeVideos: true, includeSvgs: true }) {
        const assets = [];
        
        // Helper to resolve relative URLs
        const resolveUrl = (url) => {
            if (url.startsWith('http') || url.startsWith('data:')) return url;
            if (url.startsWith('/')) return window.location.origin + url;
            return new URL(url, window.location.href).href;
        };
        
        // Extract images from img tags
        document.querySelectorAll('img[src]').forEach(img => {
            const src = resolveUrl(img.src);
            if (src && !src.startsWith('data:') && !src.includes('dev-toolkit') && !assets.some(a => a.url === src)) {
                const isSvg = src.endsWith('.svg') || src.includes('.svg?');
                const type = isSvg ? 'svg' : 'image';
                
                if ((type === 'image' && filters.includeImages) || (type === 'svg' && filters.includeSvgs)) {
                    assets.push({
                        type: type,
                        url: src,
                        name: getFileName(img.src),
                        size: `${img.naturalWidth || img.width}×${img.naturalHeight || img.height}`,
                        alt: img.alt || 'No alt text'
                    });
                }
            }
        });
        
        // Extract inline SVGs
        if (filters.includeSvgs) {
            document.querySelectorAll('svg').forEach((svg, index) => {
                const svgData = new XMLSerializer().serializeToString(svg);
                const dataUrl = `data:image/svg+xml;base64,${btoa(svgData)}`;
                if (!assets.some(a => a.url === dataUrl)) {
                    assets.push({
                        type: 'svg',
                        url: dataUrl,
                        name: `inline-svg-${index + 1}`,
                        size: `${svg.getBoundingClientRect().width}×${svg.getBoundingClientRect().height}`
                    });
                }
            });
        }
        
        // Extract videos
        if (filters.includeVideos) {
            document.querySelectorAll('video').forEach(video => {
                if (video.src && !video.src.startsWith('data:')) {
                    const src = resolveUrl(video.src);
                    if (!assets.some(a => a.url === src)) {
                        assets.push({
                            type: 'video',
                            url: src,
                            name: getFileName(video.src),
                            size: `${video.videoWidth || video.width}×${video.videoHeight || video.height}`
                        });
                    }
                }
                
                // Check for source elements
                video.querySelectorAll('source[src]').forEach(source => {
                    const src = resolveUrl(source.src);
                    if (src && !assets.some(a => a.url === src)) {
                        assets.push({
                            type: 'video',
                            url: src,
                            name: getFileName(source.src),
                            format: source.type || 'unknown'
                        });
                    }
                });
            });
        }
        
        // Extract CSS background images
        document.querySelectorAll('*').forEach(element => {
            const style = window.getComputedStyle(element);
            const backgroundImage = style.backgroundImage;
            
            if (backgroundImage && backgroundImage !== 'none') {
                const urlMatch = backgroundImage.match(/url\$['"]?([^'")]+)['"]?\$/);
                if (urlMatch && !urlMatch[1].startsWith('data:')) {
                    const bgUrl = resolveUrl(urlMatch[1]);
                    if (bgUrl && !assets.some(a => a.url === bgUrl)) {
                        const isSvg = bgUrl.endsWith('.svg') || bgUrl.includes('.svg?');
                        const type = isSvg ? 'svg' : 'background-image';
                        
                        if ((type === 'background-image' && filters.includeImages) || (type === 'svg' && filters.includeSvgs)) {
                            assets.push({
                                type: type,
                                url: bgUrl,
                                name: getFileName(urlMatch[1]),
                                element: element.tagName.toLowerCase()
                            });
                        }
                    }
                }
            }
        });
        
        // Remove duplicates and sort by type
        const uniqueAssets = assets.filter((asset, index, self) => 
            index === self.findIndex(a => a.url === asset.url)
        );
        uniqueAssets.sort((a, b) => a.type.localeCompare(b.type));
        
        return uniqueAssets;
    }

    function getFileName(url) {
        try {
            return url.split('/').pop().split('?')[0] || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    // Tech stack detection
    function detectTechStack() {
        const stack = {
            'Frontend (Client-Side)': [],
            'Backend (Server-Side)': [],
            'Hosting & Infrastructure': [],
            'Analytics & Tracking': [],
            'SEO & Marketing Tools': [],
            'Security & Performance': [],
            'E-commerce Stack': [],
            'Media & Assets': [],
            'Dev & Build Tools': []
        };

        // Helper to avoid duplicates
        const addToStack = (category, item) => {
            if (!stack[category].includes(item)) {
                stack[category].push(item);
            }
        };

        // Check HTML version
        const htmlVersion = document.doctype ? 'HTML5' : 'Unknown';
        if (htmlVersion === 'HTML5') addToStack('Frontend (Client-Side)', 'HTML5');

        // Check global window objects for frameworks and libraries
        if (window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) addToStack('Frontend (Client-Side)', 'React');
        if (window.Vue || window.__VUE__) addToStack('Frontend (Client-Side)', 'Vue.js');
        if (window.angular) addToStack('Frontend (Client-Side)', 'Angular');
        if (window.Svelte) addToStack('Frontend (Client-Side)', 'Svelte');
        if (window.__NEXT_DATA__) addToStack('Frontend (Client-Side)', 'Next.js');
        if (window.__NUXT__) addToStack('Frontend (Client-Side)', 'Nuxt.js');
        if (window.Gatsby) addToStack('Frontend (Client-Side)', 'Gatsby');

        // JavaScript Libraries
        if (window.jQuery || window.$) addToStack('Frontend (Client-Side)', 'jQuery');
        if (window._ || window.lodash) addToStack('Frontend (Client-Side)', 'Lodash');
        if (window.moment) addToStack('Frontend (Client-Side)', 'Moment.js');
        if (window.axios) addToStack('Frontend (Client-Side)', 'Axios');
        if (window.Chart) addToStack('Frontend (Client-Side)', 'Chart.js');
        if (window.d3) addToStack('Frontend (Client-Side)', 'D3.js');
        if (window.THREE) addToStack('Frontend (Client-Side)', 'Three.js');
        if (window.gsap || window.TweenMax) addToStack('Frontend (Client-Side)', 'GSAP');
        if (window.Swiper) addToStack('Frontend (Client-Side)', 'Swiper');
        if (window.Slick) addToStack('Frontend (Client-Side)', 'Slick');
        if (window.AOS) addToStack('Frontend (Client-Side)', 'AOS');
        if (window.alpine) addToStack('Frontend (Client-Side)', 'Alpine.js');

        // CSS Frameworks
        if (window.bootstrap) addToStack('Frontend (Client-Side)', 'Bootstrap');
        if (window.MaterialUI) addToStack('Frontend (Client-Side)', 'Material UI');
        if (window.ChakraUI) addToStack('Frontend (Client-Side)', 'Chakra UI');
        if (window.antd) addToStack('Frontend (Client-Side)', 'Ant Design');
        if (window.bulma) addToStack('Frontend (Client-Side)', 'Bulma');
        if (window.foundation) addToStack('Frontend (Client-Side)', 'Foundation');

        // Backend indicators and databases
        if (window.firebase) {
            addToStack('Backend (Server-Side)', 'Firebase');
            addToStack('Backend (Server-Side)', 'Firebase');
        }
        if (window.supabase) addToStack('Backend (Server-Side)', 'Supabase');
        if (window.appwrite) addToStack('Backend (Server-Side)', 'Appwrite');

        // Analytics and tracking
        if (window.ga || window.gtag) addToStack('Analytics & Tracking', 'Google Analytics');
        if (window.dataLayer) addToStack('Analytics & Tracking', 'Google Tag Manager');
        if (window.fbq) addToStack('Analytics & Tracking', 'Facebook Pixel');
        if (window.amplitude) addToStack('Analytics & Tracking', 'Amplitude');
        if (window.hotjar) addToStack('Analytics & Tracking', 'Hotjar');
        if (window.clarity) addToStack('Analytics & Tracking', 'Microsoft Clarity');
        if (window.mixpanel) addToStack('Analytics & Tracking', 'Mixpanel');
        if (window.ttq) addToStack('Analytics & Tracking', 'TikTok Pixel');

        // Check meta tags
        document.querySelectorAll('meta').forEach(meta => {
            const name = meta.getAttribute('name') || meta.getAttribute('property');
            const content = meta.getAttribute('content');

            if (name === 'generator' && content) {
                const gen = content.toLowerCase();
                if (gen.includes('wordpress')) addToStack('Backend (Server-Side)', 'WordPress');
                else if (gen.includes('shopify')) addToStack('E-commerce Stack', 'Shopify');
                else if (gen.includes('woocommerce')) addToStack('E-commerce Stack', 'WooCommerce');
                else if (gen.includes('magento')) addToStack('E-commerce Stack', 'Magento');
                else if (gen.includes('webflow')) addToStack('Backend (Server-Side)', 'Webflow');
                else if (gen.includes('wix')) addToStack('Backend (Server-Side)', 'Wix');
                else if (gen.includes('ghost')) addToStack('Backend (Server-Side)', 'Ghost');
                else if (gen.includes('joomla')) addToStack('Backend (Server-Side)', 'Joomla');
                else if (gen.includes('drupal')) addToStack('Backend (Server-Side)', 'Drupal');
                else addToStack('Backend (Server-Side)', content);
            }

            if (name === 'viewport') {
                addToStack('Dev & Build Tools', 'Responsive Design');
            }
        });

        // Check scripts and links for CDN, frameworks, and tools
        document.querySelectorAll('script[src], link[href]').forEach(element => {
            const src = (element.src || element.href || '').toLowerCase();

            // Hosting & Infrastructure
            if (src.includes('cloudflare')) addToStack('Hosting & Infrastructure', 'Cloudflare');
            if (src.includes('googleapis.com')) addToStack('Hosting & Infrastructure', 'Google APIs');
            if (src.includes('jsdelivr.net')) addToStack('Hosting & Infrastructure', 'jsDelivr');
            if (src.includes('unpkg.com')) addToStack('Hosting & Infrastructure', 'UNPKG');
            if (src.includes('s3.amazonaws.com') || src.includes('amazonaws.com')) addToStack('Hosting & Infrastructure', 'AWS');
            if (src.includes('vercel.app')) addToStack('Hosting & Infrastructure', 'Vercel');
            if (src.includes('netlify.com')) addToStack('Hosting & Infrastructure', 'Netlify');
            if (src.includes('azure')) addToStack('Hosting & Infrastructure', 'Azure');
            if (src.includes('digitalocean')) addToStack('Hosting & Infrastructure', 'DigitalOcean');
            if (src.includes('fastly')) addToStack('Hosting & Infrastructure', 'Fastly');
            if (src.includes('akamai')) addToStack('Hosting & Infrastructure', 'Akamai');

            // Frontend (Client-Side) - CSS Frameworks
            if (src.includes('bootstrap')) addToStack('Frontend (Client-Side)', 'Bootstrap');
            if (src.includes('tailwind')) addToStack('Frontend (Client-Side)', 'Tailwind CSS');
            if (src.includes('material')) addToStack('Frontend (Client-Side)', 'Material UI');
            if (src.includes('fontawesome') || src.includes('font-awesome')) addToStack('Frontend (Client-Side)', 'Font Awesome');
            if (src.includes('material-icons')) addToStack('Frontend (Client-Side)', 'Material Icons');
            if (src.includes('bulma')) addToStack('Frontend (Client-Side)', 'Bulma');
            if (src.includes('foundation')) addToStack('Frontend (Client-Side)', 'Foundation');

            // Dev & Build Tools
            if (src.includes('webpack')) addToStack('Dev & Build Tools', 'Webpack');
            if (src.includes('vite')) addToStack('Dev & Build Tools', 'Vite');
            if (src.includes('parcel')) addToStack('Dev & Build Tools', 'Parcel');
            if (src.includes('babel')) addToStack('Dev & Build Tools', 'Babel');
            if (src.includes('swc')) addToStack('Dev & Build Tools', 'SWC');
            if (src.includes('typescript')) addToStack('Dev & Build Tools', 'TypeScript');

            // E-commerce Stack
            if (src.includes('shopify')) addToStack('E-commerce Stack', 'Shopify');
            if (src.includes('woocommerce')) addToStack('E-commerce Stack', 'WooCommerce');
            if (src.includes('stripe')) addToStack('E-commerce Stack', 'Stripe');
            if (src.includes('paypal')) addToStack('E-commerce Stack', 'PayPal');
            if (src.includes('razorpay')) addToStack('E-commerce Stack', 'Razorpay');

            // Media & Assets
            if (src.includes('fonts.googleapis.com')) addToStack('Media & Assets', 'Google Fonts');

            // Security & Performance
            if (src.includes('recaptcha')) addToStack('Security & Performance', 'reCAPTCHA');
        });

        // Check for framework-specific DOM signatures
        if (document.querySelector('[data-reactroot]') || document.querySelector('[data-react-helmet]')) {
            addToStack('Frontend (Client-Side)', 'React');
        }
        if (document.querySelector('div[data-v-]') || document.querySelector('[v-]')) {
            addToStack('Frontend (Client-Side)', 'Vue.js');
        }
        if (document.querySelector('[ng-app]') || document.querySelector('[ng-controller]')) {
            addToStack('Frontend (Client-Side)', 'Angular');
        }

        // Check for Tailwind CSS utility classes (sample check)
        const bodyClasses = document.body.className || '';
        const hasTailwindClasses = /\b(flex|grid|bg-|text-|p-|m-|w-|h-)/.test(bodyClasses);
        if (hasTailwindClasses) {
            addToStack('Frontend (Client-Side)', 'Tailwind CSS');
        }

        // Check for image formats
        const images = document.querySelectorAll('img[src]');
        images.forEach(img => {
            const src = img.src.toLowerCase();
            if (src.includes('.webp')) addToStack('Media & Assets', 'WebP Images');
            if (src.includes('.avif')) addToStack('Media & Assets', 'AVIF Images');
        });

        // Check for lazy loading
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        if (lazyImages.length > 0) addToStack('Media & Assets', 'Lazy Loading');

        // Check for SSL/HTTPS
        if (location.protocol === 'https:') addToStack('Security & Performance', 'SSL Certificate');

        // Check for schema markup
        const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
        if (schemaScripts.length > 0) addToStack('SEO & Marketing Tools', 'Schema Markup');

        // Check for Open Graph and Twitter Cards
        const ogTags = document.querySelectorAll('meta[property^="og:"]');
        if (ogTags.length > 0) addToStack('SEO & Marketing Tools', 'Open Graph');

        const twitterTags = document.querySelectorAll('meta[name^="twitter:"]');
        if (twitterTags.length > 0) addToStack('SEO & Marketing Tools', 'Twitter Cards');

        // Check for sitemap and robots.txt
        const sitemapLink = document.querySelector('link[rel="sitemap"]');
        if (sitemapLink) addToStack('SEO & Marketing Tools', 'Sitemap.xml');

        // Check script content for additional libraries
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent || '').join(' ').toLowerCase();
        if (scripts.includes('chart.js')) addToStack('Frontend (Client-Side)', 'Chart.js');
        if (scripts.includes('d3.js') || scripts.includes('d3.')) addToStack('Frontend (Client-Side)', 'D3.js');
        if (scripts.includes('three.js') || scripts.includes('three.')) addToStack('Frontend (Client-Side)', 'Three.js');
        if (scripts.includes('gsap')) addToStack('Frontend (Client-Side)', 'GSAP');
        if (scripts.includes('svelte')) addToStack('Frontend (Client-Side)', 'Svelte');
        if (scripts.includes('alpine')) addToStack('Frontend (Client-Side)', 'Alpine.js');

        // Check for specific platform indicators
        if (document.querySelector('link[href*="shopify"]') || window.Shopify) {
            addToStack('E-commerce Stack', 'Shopify');
        }
        if (document.querySelector('meta[name="generator"][content*="WordPress"]')) {
            addToStack('Backend (Server-Side)', 'WordPress');
        }

        // Check for minified/bundled assets
        const minifiedScripts = document.querySelectorAll('script[src*="min."], script[src*=".min"]');
        if (minifiedScripts.length > 0) addToStack('Dev & Build Tools', 'Minified Assets');

        // Check for source maps
        const sourceMapScripts = document.querySelectorAll('script[src*="map"], link[href*="map"]');
        if (sourceMapScripts.length > 0) addToStack('Dev & Build Tools', 'Source Maps');

        // Check for programming language indicators (backend)
        if (document.querySelector('meta[name="generator"][content*="PHP"]') ||
            scripts.includes('php') ||
            document.querySelector('script[src*="php"]')) {
            addToStack('Backend (Server-Side)', 'PHP');
        }
        if (scripts.includes('node') || scripts.includes('express')) {
            addToStack('Backend (Server-Side)', 'Node.js');
            if (scripts.includes('express')) addToStack('Backend (Server-Side)', 'Express.js');
        }
        if (scripts.includes('django') || scripts.includes('python')) {
            addToStack('Backend (Server-Side)', 'Python');
            if (scripts.includes('django')) addToStack('Backend (Server-Side)', 'Django');
        }
        if (scripts.includes('rails') || scripts.includes('ruby')) {
            addToStack('Backend (Server-Side)', 'Ruby');
            if (scripts.includes('rails')) addToStack('Backend (Server-Side)', 'Ruby on Rails');
        }
        if (scripts.includes('laravel')) {
            addToStack('Backend (Server-Side)', 'PHP');
            addToStack('Backend (Server-Side)', 'Laravel');
        }

        // Check for database indicators
        if (scripts.includes('mysql') || scripts.includes('mariadb')) addToStack('Backend (Server-Side)', 'MySQL');
        if (scripts.includes('postgresql') || scripts.includes('postgres')) addToStack('Backend (Server-Side)', 'PostgreSQL');
        if (scripts.includes('mongodb') || scripts.includes('mongo')) addToStack('Backend (Server-Side)', 'MongoDB');
        if (scripts.includes('redis')) addToStack('Backend (Server-Side)', 'Redis');

        // Check for web servers
        if (document.querySelector('meta[name="generator"][content*="Apache"]')) addToStack('Hosting & Infrastructure', 'Apache');
        if (document.querySelector('meta[name="generator"][content*="Nginx"]')) addToStack('Hosting & Infrastructure', 'Nginx');
        if (document.querySelector('meta[name="generator"][content*="LiteSpeed"]')) addToStack('Hosting & Infrastructure', 'LiteSpeed');

        // Check for Yoast SEO and RankMath
        if (document.querySelector('meta[name="generator"][content*="Yoast"]')) addToStack('SEO & Marketing Tools', 'Yoast SEO');
        if (document.querySelector('meta[name="generator"][content*="RankMath"]')) addToStack('SEO & Marketing Tools', 'RankMath');

        return stack;
    }

    // SEO analysis
    function analyzeSEO() {
        const seo = {
            basics: {},
            content: {},
            technical: {},
            social: {},
            score: 0,
            recommendations: []
        };

        let totalScore = 0;
        let maxScore = 0;

        // Helper to add score and status
        const addMetric = (category, key, value, points, maxPoints, status, message = '') => {
            seo[category][key] = { value, status, message };
            totalScore += points;
            maxScore += maxPoints;
            if (status === 'error' || status === 'warning') {
                seo.recommendations.push(message);
            }
        };

        const getStatus = (condition, goodMsg = '', warningMsg = '', errorMsg = '') => {
            if (condition === 'good') return { status: 'good', message: goodMsg };
            if (condition === 'warning') return { status: 'warning', message: warningMsg };
            return { status: 'error', message: errorMsg };
        };

        // Basics (30% weight)
        // Title
        const title = document.title || 'Missing';
        const titleLen = title.length;
        let titleStatus = 'error';
        let titleMsg = 'Add a title tag (50-60 characters optimal).';
        if (titleLen > 0) {
            if (titleLen >= 50 && titleLen <= 60) titleStatus = 'good';
            else if (titleLen >= 30 && titleLen <= 70) titleStatus = 'warning';
            else titleStatus = 'error';
            titleMsg = titleStatus === 'good' ? 'Title length optimal.' : `Title length ${titleLen} (optimal 50-60 chars).`;
        }
        addMetric('basics', 'title', title, titleStatus === 'good' ? 10 : titleStatus === 'warning' ? 5 : 0, 10, titleStatus, titleMsg);

        // Meta Description
        const metaDesc = document.querySelector('meta[name="description"]');
        const desc = metaDesc ? metaDesc.content : 'Missing';
        const descLen = desc.length;
        let descStatus = 'error';
        let descMsg = 'Add a meta description (150-160 characters optimal).';
        if (descLen > 0) {
            if (descLen >= 150 && descLen <= 160) descStatus = 'good';
            else if (descLen >= 120 && descLen <= 180) descStatus = 'warning';
            else descStatus = 'error';
            descMsg = descStatus === 'good' ? 'Description length optimal.' : `Description length ${descLen} (optimal 150-160 chars).`;
        }
        addMetric('basics', 'metaDescription', desc, descStatus === 'good' ? 10 : descStatus === 'warning' ? 5 : 0, 10, descStatus, descMsg);

        // Meta Keywords (less important, 10 points max)
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        const keywords = metaKeywords ? metaKeywords.content : 'Missing';
        let keywordsStatus = keywords !== 'Missing' ? 'good' : 'warning';
        addMetric('basics', 'metaKeywords', keywords, keywordsStatus === 'good' ? 10 : 0, 10, keywordsStatus, keywordsStatus === 'good' ? 'Keywords present.' : 'Keywords optional but recommended.');

        // Content (40% weight)
        // Headings
        const h1Count = document.querySelectorAll('h1').length;
        let h1Status = h1Count === 1 ? 'good' : h1Count > 1 ? 'warning' : 'error';
        let h1Msg = h1Status === 'good' ? 'One H1 heading (optimal).' : h1Status === 'warning' ? `${h1Count} H1s (use one primary).` : 'Add an H1 heading.';
        addMetric('content', 'h1Count', h1Count, h1Status === 'good' ? 15 : h1Status === 'warning' ? 10 : 0, 15, h1Status, h1Msg);

        const headings = {
            h1: h1Count,
            h2: document.querySelectorAll('h2').length,
            h3: document.querySelectorAll('h3').length,
            h4: document.querySelectorAll('h4').length,
            h5: document.querySelectorAll('h5').length,
            h6: document.querySelectorAll('h6').length
        };
        seo.content.headings = headings; // Keep for display

        // Images Alt
        const images = document.querySelectorAll('img');
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt]), img[alt=""]');
        const altCoverage = images.length > 0 ? ((images.length - imagesWithoutAlt.length) / images.length * 100) : 100;
        let altStatus = altCoverage >= 90 ? 'good' : altCoverage >= 70 ? 'warning' : 'error';
        let altMsg = altStatus === 'good' ? 'Good alt text coverage.' : `Alt text coverage: ${Math.round(altCoverage)}% (aim for >90%).`;
        addMetric('content', 'altCoverage', `${Math.round(altCoverage)}%`, altStatus === 'good' ? 15 : altStatus === 'warning' ? 10 : 0, 15, altStatus, altMsg);
        seo.content.totalImages = images.length;
        seo.content.imagesWithoutAlt = imagesWithoutAlt.length;

        // Links (basic check for presence)
        const links = document.querySelectorAll('a[href]');
        let linksStatus = links.length > 0 ? 'good' : 'warning';
        addMetric('content', 'totalLinks', links.length, linksStatus === 'good' ? 10 : 0, 10, linksStatus, linksStatus === 'good' ? 'Links present.' : 'Add internal/external links.');

        // Technical (20% weight)
        // Canonical
        const canonical = document.querySelector('link[rel="canonical"]');
        let canonicalStatus = canonical ? 'good' : 'warning';
        addMetric('technical', 'canonicalUrl', canonical ? canonical.href : 'Missing', canonicalStatus === 'good' ? 5 : 0, 5, canonicalStatus, canonicalStatus === 'good' ? 'Canonical URL present.' : 'Add canonical link to prevent duplicate content.');

        // Viewport
        const viewport = document.querySelector('meta[name="viewport"]');
        let viewportStatus = viewport ? 'good' : 'error';
        addMetric('technical', 'viewport', viewport ? viewport.content : 'Missing', viewportStatus === 'good' ? 5 : 0, 5, viewportStatus, viewportStatus === 'good' ? 'Viewport meta present (mobile-friendly).' : 'Add viewport meta for mobile optimization.');

        // Lang
        const lang = document.documentElement.lang;
        let langStatus = lang ? 'good' : 'warning';
        addMetric('technical', 'lang', lang || 'Missing', langStatus === 'good' ? 3 : 0, 3, langStatus, langStatus === 'good' ? 'Language attribute set.' : 'Add lang attribute to <html> for accessibility.');

        // Charset
        const charset = document.querySelector('meta[charset]');
        let charsetStatus = charset ? 'good' : 'warning';
        addMetric('technical', 'charset', charset ? charset.charset : 'Missing', charsetStatus === 'good' ? 2 : 0, 2, charsetStatus, charsetStatus === 'good' ? 'Charset declared.' : 'Add <meta charset="UTF-8"> early in <head>.');

        // HTTPS
        const httpsStatus = location.protocol === 'https:' ? 'good' : 'error';
        addMetric('technical', 'https', location.protocol, httpsStatus === 'good' ? 5 : 0, 5, httpsStatus, httpsStatus === 'good' ? 'HTTPS enabled (secure).' : 'Switch to HTTPS for security and SEO.');

        // Schema (basic detection)
        const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
        let schemaStatus = schemaScripts.length > 0 ? 'good' : 'warning';
        addMetric('technical', 'schema', schemaScripts.length > 0 ? 'Present' : 'Missing', schemaStatus === 'good' ? 0 : 0, 0, schemaStatus, schemaStatus === 'good' ? 'Schema markup detected.' : 'Consider adding structured data (JSON-LD) for rich snippets.');

        // Social (10% weight)
        // Open Graph
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogImage = document.querySelector('meta[property="og:image"]');
        const ogPresent = ogTitle || ogDesc || ogImage;
        let ogStatus = ogPresent ? 'good' : 'warning';
        seo.social.openGraph = {
            title: ogTitle ? ogTitle.content : 'Missing',
            description: ogDesc ? ogDesc.content : 'Missing',
            image: ogImage ? ogImage.content : 'Missing'
        };
        addMetric('social', 'openGraph', ogPresent ? 'Present' : 'Missing', ogStatus === 'good' ? 5 : 0, 5, ogStatus, ogStatus === 'good' ? 'Open Graph tags present.' : 'Add OG tags for social sharing.');

        // Twitter Card
        const twitterCard = document.querySelector('meta[name="twitter:card"]');
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        const twitterPresent = twitterCard || twitterTitle;
        let twitterStatus = twitterPresent ? 'good' : 'warning';
        seo.social.twitterCard = {
            type: twitterCard ? twitterCard.content : 'Missing',
            title: twitterTitle ? twitterTitle.content : 'Missing'
        };
        addMetric('social', 'twitterCard', twitterPresent ? 'Present' : 'Missing', twitterStatus === 'good' ? 5 : 0, 5, twitterStatus, twitterStatus === 'good' ? 'Twitter Card tags present.' : 'Add Twitter Card tags for better tweets.');

        // Advanced Title & Meta Validation
        seo.basics.titleLength = titleLen;
        seo.basics.titleLengthStatus = titleLen >= 50 && titleLen <= 60 ? 'good' : titleLen >= 30 && titleLen <= 70 ? 'warning' : 'error';
        seo.basics.descLength = descLen;
        seo.basics.descLengthStatus = descLen >= 150 && descLen <= 160 ? 'good' : descLen >= 120 && descLen <= 180 ? 'warning' : 'error';
        seo.basics.duplicateTitle = false; // Placeholder for same page comparison
        seo.basics.duplicateDesc = false; // Placeholder

        // Heading Structure Validator
        const headingLevels = [1,2,3,4,5,6];
        const headingCounts = headingLevels.map(level => document.querySelectorAll(`h${level}`).length);
        seo.content.headingStructure = {
            counts: headingCounts,
            skippedLevels: [],
            multipleH1: h1Count > 1,
            hierarchy: []
        };
        let currentLevel = 0;
        const allHeadings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
        allHeadings.forEach(h => {
            const level = parseInt(h.tagName.charAt(1));
            if (level > currentLevel + 1) {
                seo.content.headingStructure.skippedLevels.push(`H${currentLevel} → H${level}`);
            }
            currentLevel = level;
            seo.content.headingStructure.hierarchy.push({
                level: level,
                text: h.textContent.trim().substring(0, 50)
            });
        });

        // Image SEO Enhancements
        seo.content.imagesWithoutAltList = Array.from(imagesWithoutAlt).map(img => ({
            src: img.src,
            alt: img.alt
        }));
        seo.content.oversizedImages = []; // Placeholder - can't check size without fetch
        seo.content.lazyLoadingCount = document.querySelectorAll('img[loading="lazy"]').length;

        // Link Analysis Upgrade
        const allLinks = Array.from(links);
        const internalLinks = allLinks.filter(a => a.hostname === window.location.hostname);
        const externalLinks = allLinks.filter(a => a.hostname !== window.location.hostname);
        seo.content.internalLinks = internalLinks.length;
        seo.content.externalLinks = externalLinks.length;
        seo.content.brokenLinks = []; // Placeholder - limit fetch for performance
        seo.content.nofollowCount = document.querySelectorAll('a[rel*="nofollow"]').length;
        seo.content.sponsoredCount = document.querySelectorAll('a[rel*="sponsored"]').length;
        seo.content.ugcCount = document.querySelectorAll('a[rel*="ugc"]').length;
        seo.content.genericAnchors = allLinks.filter(a => {
            const text = a.textContent.trim().toLowerCase();
            return text === '' || ['click here', 'read more', 'here', 'link'].includes(text);
        }).length;

        // Technical SEO Advanced
        seo.technical.robotsMeta = document.querySelector('meta[name="robots"]')?.content || 'Missing';
        seo.technical.xRobotsTag = document.querySelector('meta[name="X-Robots-Tag"]')?.content || 'Missing';
        seo.technical.hreflangCount = document.querySelectorAll('link[rel="alternate"][hreflang]').length;
        seo.technical.sitemap = document.querySelector('link[rel="sitemap"]')?.href || 'Missing';
        seo.technical.favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.href || 'Missing';

        // Core Web Vitals
        seo.coreWebVitals = { lcp: 'Unknown', cls: 'Unknown', inp: 'Unknown' };
        if (window.PerformanceObserver) {
            try {
                // LCP Observer
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    seo.coreWebVitals.lcp = lastEntry.startTime;
                    seo.coreWebVitals.lcpStatus = lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'warning' : 'error';
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
                // Fallback if not supported
            }
        }

        // Schema Details
        seo.schema = {
            count: schemaScripts.length,
            types: [],
            valid: true
        };
        schemaScripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                if (data['@type']) {
                    seo.schema.types.push(data['@type']);
                }
            } catch (e) {
                seo.schema.valid = false;
            }
        });

        // Social Preview Enhancements
        seo.social.openGraph.imagePreview = ogImage ? ogImage.content : 'Missing';
        seo.social.twitterCard.imagePreview = document.querySelector('meta[name="twitter:image"]')?.content || 'Missing';

        // Page Load Time (bonus, not scored heavily)
        seo.pageLoadTime = performance.timing ? 
            (performance.timing.loadEventEnd - performance.timing.navigationStart) : 'Unknown';
        if (seo.pageLoadTime !== 'Unknown') {
            const loadTime = parseInt(seo.pageLoadTime);
            let loadStatus = loadTime < 3000 ? 'good' : loadTime < 5000 ? 'warning' : 'error';
            seo.technical.pageLoadTime = { value: seo.pageLoadTime, status: loadStatus, message: loadStatus === 'good' ? 'Fast load time.' : `Load time ${loadTime}ms (aim <3s).` };
            if (loadStatus !== 'good') seo.recommendations.push('Optimize for faster page load (compress images, minify JS/CSS).');
        }

        // Calculate overall score
        seo.score = Math.round((totalScore / maxScore) * 100);

        // Add general recommendations if score low
        if (seo.score < 70) {
            seo.recommendations.unshift(`Overall SEO Score: ${seo.score}/100 - Room for improvement! Focus on basics first.`);
        } else if (seo.score < 90) {
            seo.recommendations.unshift(`Overall SEO Score: ${seo.score}/100 - Good, but optimize further.`);
        } else {
            seo.recommendations.unshift(`Overall SEO Score: ${seo.score}/100 - Excellent!`);
        }

        return seo;
    }

    // HTML validation
    function validateHTML() {
        const issues = [];
        
        // Check for missing alt attributes
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt]), img[alt=""]');
        if (imagesWithoutAlt.length > 0) {
            issues.push(`${imagesWithoutAlt.length} images missing alt attributes`);
        }
        
        // Check for missing page title
        if (!document.title || document.title.trim() === '') {
            issues.push('Page title is missing or empty');
        }
        
        // Check for duplicate IDs
        const ids = [];
        const duplicateIds = [];
        document.querySelectorAll('[id]').forEach(element => {
            if (ids.includes(element.id)) {
                if (!duplicateIds.includes(element.id)) {
                    duplicateIds.push(element.id);
                }
            } else {
                ids.push(element.id);
            }
        });
        
        if (duplicateIds.length > 0) {
            issues.push(`Duplicate IDs found: ${duplicateIds.join(', ')}`);
        }
        
        // Check for missing meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            issues.push('Meta description is missing');
        }
        
        // Check for missing lang attribute
        if (!document.documentElement.lang) {
            issues.push('HTML lang attribute is missing');
        }
        
        // Check for inline styles (accessibility issue)
        const elementsWithInlineStyles = document.querySelectorAll('[style]');
        if (elementsWithInlineStyles.length > 10) {
            issues.push(`${elementsWithInlineStyles.length} elements with inline styles (consider using CSS classes)`);
        }
        
        return {
            issuesFound: issues.length,
            issues: issues,
            summary: issues.length === 0 ? 'No major issues detected!' : `${issues.length} issues found`
        };
    }

    // Image optimization
    function optimizeImages() {
        let optimized = 0;
        
        document.querySelectorAll('img').forEach(img => {
            // Add responsive attributes if missing
            if (!img.style.maxWidth && !img.getAttribute('style')?.includes('max-width')) {
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                optimized++;
            }
            
            // Add loading="lazy" if not present and not in viewport
            if (!img.hasAttribute('loading')) {
                const rect = img.getBoundingClientRect();
                if (rect.top > window.innerHeight) {
                    img.setAttribute('loading', 'lazy');
                }
            }
        });
        
        showToast(`Optimized ${optimized} images for responsive display`);
    }

    // FIX START - Issues 1 & 2: Remove iframe content scaling and auto-zoom hacks
    // Responsive preview functionality - UPDATED to handle viewType
    function showResponsivePreview(viewType, width, height, deviceName) {
        // Remove any existing responsive overlay first
        const existingOverlay = document.querySelector('.dev-toolkit-responsive-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
            // Also revoke any existing blob URLs if we were using them
            // (This assumes only one blobUrl is active at a time for responsive preview)
            // More robust cleanup might be needed if multiple blobUrls are managed.
        }

        const baseUrl = window.location.href;
        // Inject CSS to prevent auto-zoom and reset any transform scale
        const resetZoomStyle = `<style>html, body { zoom: 1 !important; transform: scale(1) !important; transform-origin: top left !important; }</style>`;
        const fullHtml = `<base href="${baseUrl}">` + document.documentElement.outerHTML.replace('</head>', resetZoomStyle + '</head>');
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);

        const overlay = document.createElement('div');
        overlay.className = 'dev-toolkit-responsive-overlay';

        const closeButton = document.createElement('button');
        closeButton.className = 'dev-toolkit-responsive-close';
        closeButton.innerText = '×';
        closeButton.onclick = () => {
            overlay.remove();
            URL.revokeObjectURL(blobUrl);
            document.removeEventListener('keydown', escHandler); // Remove specific handler
        };
        overlay.appendChild(closeButton);

        const container = document.createElement('div');
        container.className = 'dev-toolkit-responsive-container';

        const createDeviceFrame = (frameWidth, frameHeight, frameName, isMobile = false) => {
            const frame = document.createElement('div');
            frame.className = `dev-toolkit-device-frame ${isMobile ? 'dev-toolkit-mobile-frame' : 'dev-toolkit-desktop-frame'}`;

            // Use the passed frameWidth and frameHeight for all device types
            // This allows different devices (Samsung, Redmi, etc.) to have different dimensions
            if (frameWidth && frameHeight) {
                frame.style.width = `${frameWidth}px`;
                frame.style.height = `${frameHeight}px`;
            } else if (viewType === 'both') {
                // For 'both' view with no specific dimensions, use defaults
                if (isMobile) {
                    frame.style.width = '430px'; // Default mobile for both view
                    frame.style.height = '932px';
                } else {
                    frame.style.width = '1440px'; // Default desktop for both view
                    frame.style.height = '900px';
                }
            } else {
                // Fallback for single views if no dimensions provided
                frame.style.width = `${frameWidth}px`;
                frame.style.height = `${frameHeight}px`;
            }


            const header = document.createElement('div');
            header.className = 'dev-toolkit-device-header';
            header.innerText = `${frameName} (${frame.style.width} x ${frame.style.height})`;

            const iframe = document.createElement('iframe');
            iframe.className = 'dev-toolkit-device-iframe';
            iframe.src = blobUrl;
            iframe.width = frame.style.width; // Use computed style for iframe width
            iframe.height = frame.style.height; // Use computed style for iframe height
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation allow-downloads');

            frame.appendChild(header);
            frame.appendChild(iframe);
            return { frame, iframe };
        };

        let mobileIframe = null;
        let desktopIframe = null;

        if (viewType === 'mobile') {
            const { frame, iframe } = createDeviceFrame(width, height, deviceName, true);
            container.appendChild(frame);
            mobileIframe = iframe;
        } else if (viewType === 'desktop') {
            const { frame, iframe } = createDeviceFrame(width, height, deviceName, false);
            container.appendChild(frame);
            desktopIframe = iframe;
        } else if (viewType === 'tablet') {
            const { frame, iframe } = createDeviceFrame(width, height, deviceName, false);
            container.appendChild(frame);
            desktopIframe = iframe;
        } else if (viewType === 'both') {
            const { frame: mobileFrame, iframe: mIframe } = createDeviceFrame(337, 667, 'Mobile', true);
            const { frame: desktopFrame, iframe: dIframe } = createDeviceFrame(1440, 900, 'Desktop', false);
            container.appendChild(mobileFrame);
            container.appendChild(desktopFrame);
            mobileIframe = mIframe;
            desktopIframe = dIframe;
        }

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Calculate scale to fit the container within the viewport if needed
        const rect = container.getBoundingClientRect();
        const scaleX = window.innerWidth / rect.width;
        const scaleY = window.innerHeight / rect.height;
        const scale = Math.min(1, scaleX, scaleY);
        if (scale < 1) {
            container.style.transform = `scale(${scale})`;
            container.style.transformOrigin = 'top left';
        }

        // Sync scrolling only if both iframes are present
        const syncScroll = () => {
            if (mobileIframe && desktopIframe && mobileIframe.contentDocument && desktopIframe.contentDocument) {
                const mobileDoc = mobileIframe.contentDocument;
                const desktopDoc = desktopIframe.contentDocument;
                const mobileBody = mobileDoc.body || mobileDoc.documentElement;
                const desktopBody = desktopDoc.body || desktopDoc.documentElement;

                const syncToDesktop = () => {
                    const scrollPercent = mobileBody.scrollTop / (mobileBody.scrollHeight - mobileBody.clientHeight);
                    desktopBody.scrollTop = scrollPercent * (desktopBody.scrollHeight - desktopBody.clientHeight);
                };

                const syncToMobile = () => {
                    const scrollPercent = desktopBody.scrollTop / (desktopBody.scrollHeight - desktopBody.clientHeight);
                    mobileBody.scrollTop = scrollPercent * (mobileBody.scrollHeight - mobileBody.clientHeight);
                };

                mobileBody.addEventListener('scroll', syncToDesktop, { passive: true });
                desktopBody.addEventListener('scroll', syncToMobile, { passive: true });
            }
        };

        // Wait for iframes to load before syncing scroll (removed content scaling)
        const loadIframes = () => {
            let mobileLoaded = !mobileIframe; // If no mobile iframe, consider it loaded
            let desktopLoaded = !desktopIframe; // If no desktop iframe, consider it loaded

            if (mobileIframe && mobileIframe.contentDocument.readyState === 'complete') {
                mobileLoaded = true;
            }
            if (desktopIframe && desktopIframe.contentDocument.readyState === 'complete') {
                desktopLoaded = true;
            }

            if (mobileLoaded && desktopLoaded) {
                syncScroll();
            } else {
                // Re-check after a short delay or on iframe load event
                if (mobileIframe && !mobileLoaded) mobileIframe.onload = loadIframes;
                if (desktopIframe && !desktopLoaded) desktopIframe.onload = loadIframes;
            }
        };
        loadIframes();

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                URL.revokeObjectURL(blobUrl);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    // FIX END - Issues 1 & 2

    // Utility functions
    function showToast(message) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.dev-toolkit-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'dev-toolkit-toast';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds with slide-out animation
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    // Function to get console errors from the page
    function getConsoleErrors() {
        const errors = [];
        
        // Try to get errors from window.__devToolkitErrors (captured by our error handlers)
        if (window.__devToolkitErrors) {
            window.__devToolkitErrors.forEach(err => {
                errors.push({
                    type: err.type || 'error',
                    message: err.message,
                    stack: err.stack
                });
            });
        }
        
        // Try to get errors from the performance entries API (failed resources)
        try {
            const resourceErrors = performance.getEntriesByType('resource');
            resourceErrors.forEach(entry => {
                if (entry.transferSize === 0 || entry.responseStatus >= 400) {
                    errors.push({
                        type: 'resource-error',
                        message: `Failed to load: ${entry.name}`,
                        stack: `Status: ${entry.responseStatus || 'Network Error'}`
                    });
                }
            });
        } catch (e) {
            // Performance API might not be available
        }

        // Check for visible error elements on the page
        document.querySelectorAll('[data-error], .error, [role="alert"]').forEach(el => {
            const text = el.textContent || el.innerText;
            if (text && text.length > 0 && text.length < 1000) {
                errors.push({
                    type: 'element-error',
                    message: text.substring(0, 200),
                    stack: el.tagName
                });
            }
        });

        return errors;
    }

    // Set up error handlers immediately to capture errors
    (function() {
        window.__devToolkitErrors = [];
        
        // Override console.error to capture errors
        const originalError = console.error;
        console.error = function(...args) {
            originalError.apply(console, args);
            const errorMsg = args[0] instanceof Error ? args[0].message : String(args[0]);
            const errorStack = args[0] instanceof Error ? args[0].stack : '';
            window.__devToolkitErrors.push({
                type: 'console-error',
                message: errorMsg,
                stack: errorStack
            });
            if (window.__devToolkitErrors.length > 50) {
                window.__devToolkitErrors.shift();
            }
        };
        
        // Set up global error handler
        window.onerror = function(msg, url, line, col, error) {
            window.__devToolkitErrors.push({
                type: 'error',
                message: msg,
                stack: error ? error.stack : `Line: ${line}, Column: ${col}`
            });
            if (window.__devToolkitErrors.length > 50) {
                window.__devToolkitErrors.shift();
            }
            return false;
        };
        
        // Set up unhandled promise rejection handler
        window.onunhandledrejection = function(event) {
            window.__devToolkitErrors.push({
                type: 'unhandled-rejection',
                message: event.reason ? String(event.reason) : 'Unhandled Promise Rejection',
                stack: event.reason && event.reason.stack ? event.reason.stack : ''
            });
            if (window.__devToolkitErrors.length > 50) {
                window.__devToolkitErrors.shift();
            }
        };
    })();

    // Export functions to global scope for background script access
    // These are used by the background script for context menu and keyboard shortcuts
    window.devToolkitFunctions = {
        activateInspector,
        deactivateInspector,
        activateColorPicker,
        extractAssets,
        detectTechStack,
        analyzeSEO,
        validateHTML,
        optimizeImages,
        showResponsivePreview
    };

})();
/* End of content script */
