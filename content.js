/* Content script for the web developer toolkit */

// Immediately invoked function expression (IIFE) to encapsulate the toolkit code
(function() {
    'use strict';

    // Global state object to track the current state of toolkit features
    let toolkitState = {
        inspectorActive: false,
        colorPickerActive: false,
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
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
                line-height: 1.4 !important;
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

                    case 'getInspectorState':
                        // Return current inspector state
                        sendResponse({ success: true, inspectorActive: toolkitState.inspectorActive });
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

        // Attach event listeners
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('click', clickHandler);
        document.addEventListener('keydown', keyHandler);

        // Track event listeners for cleanup
        toolkitState.eventListeners.push(
            { element: document, event: 'mousemove', handler: mouseMoveHandler },
            { element: document, event: 'click', handler: clickHandler },
            { element: document, event: 'keydown', handler: keyHandler }
        );

        // Show activation message
        showToast('Inspector activated. Press ESC to deactivate.');
    }

    // Deactivate the HTML/CSS inspector tool and clean up
    function deactivateInspector() {
        if (!toolkitState.inspectorActive) return;
        
        toolkitState.inspectorActive = false;
        
        // Remove overlay elements from the DOM
        toolkitState.overlayElements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        toolkitState.overlayElements = [];
        
        // Remove all event listeners attached during activation
        toolkitState.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        toolkitState.eventListeners = [];
        
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

    // Create the info panel that displays element details
    function createInfoElement() {
        const info = document.createElement('div');
        info.className = 'dev-toolkit-info';
        info.style.display = 'none';
        document.body.appendChild(info);
        return info;
    }

    // Handle mouse movement during inspector mode
    // Updates overlay and info panel based on element under cursor
    function handleInspectorMouseMove(e, overlay, info) {
        // Get the element at the mouse position
        const element = document.elementFromPoint(e.clientX, e.clientY);
        // Ignore toolkit elements to prevent self-inspection
        if (!element || element.classList.contains('dev-toolkit-overlay') || 
            element.classList.contains('dev-toolkit-info') ||
            element.classList.contains('dev-toolkit-crosshair')) return;
        
        // Update overlay position to match the element
        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        overlay.style.left = (rect.left + scrollX) + 'px';
        overlay.style.top = (rect.top + scrollY) + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.display = 'block';
        
        // Position info panel near the mouse cursor
        info.style.left = (e.clientX + 10) + 'px';
        info.style.top = (e.clientY + 10) + 'px';
        info.style.display = 'block';
        
        // Get computed styles and element information
        const computedStyle = window.getComputedStyle(element);
        const elementInfo = getElementInfo(element, computedStyle);
        
        // Update info panel content
        info.innerHTML = formatElementInfo(elementInfo);
    }

    // Extract relevant information about an element for display
    function getElementInfo(element, computedStyle) {
        const rect = element.getBoundingClientRect();

        return {
            tagName: element.tagName.toLowerCase(),
            className: element.className || 'none',
            id: element.id || 'none',
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            color: computedStyle.color,
            backgroundColor: computedStyle.backgroundColor,
            fontFamily: computedStyle.fontFamily.split(',')[0].replace(/['"]/g, ''),
            fontSize: computedStyle.fontSize,
            margin: computedStyle.margin,
            padding: computedStyle.padding,
            display: computedStyle.display,
            position: computedStyle.position
        };
    }

    // Format element information into HTML for the info panel
    function formatElementInfo(info) {
        return `
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Tag:</span>
                <strong>&lt;${info.tagName}&gt;</strong>
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Class:</span>
                ${info.className}
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">ID:</span>
                ${info.id}
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Size:</span>
                ${info.width}×${info.height}px
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Color:</span>
                ${info.color}
                <span class="dev-toolkit-color-preview" style="background: ${info.color}"></span>
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Background:</span>
                ${info.backgroundColor}
                <span class="dev-toolkit-color-preview" style="background: ${info.backgroundColor}"></span>
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Font:</span>
                ${info.fontFamily}, ${info.fontSize}
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Display:</span>
                ${info.display}
            </div>
            <div class="dev-toolkit-info-row">
                <span class="dev-toolkit-info-label">Position:</span>
                ${info.position}
            </div>
        `;
    }

    function handleInspectorClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const element = e.target;
        if (element.classList.contains('dev-toolkit-overlay') || 
            element.classList.contains('dev-toolkit-info') ||
            element.classList.contains('dev-toolkit-crosshair')) return;
        
        // Copy element selector to clipboard
        const selector = generateSelector(element);
        navigator.clipboard.writeText(selector).then(() => {
            showToast(`Selector copied: ${selector}`);
        });
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

    // Function to sample color from an image at specific coordinates
    function sampleImageColor(img, x, y) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            // Get the image data at the clicked position
            const rect = img.getBoundingClientRect();
            const scaleX = img.naturalWidth / rect.width;
            const scaleY = img.naturalHeight / rect.height;
            const imgX = Math.floor((x - rect.left) * scaleX);
            const imgY = Math.floor((y - rect.top) * scaleY);

            const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;
            const r = pixel[0], g = pixel[1], b = pixel[2], a = pixel[3] / 255;

            return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})` : `rgb(${r}, ${g}, ${b})`;
        } catch (error) {
            console.error('Error sampling image color:', error);
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

    // Color picker functionality - popup on click
    function activateColorPicker() {
        if (toolkitState.colorPickerActive) return;

        toolkitState.colorPickerActive = true;

        showToast('Color picker activated! Click anywhere to pick color from CSS or images. Press ESC to close all popups.');

        const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore clicks on toolkit elements except close button
            if (e.target.classList.contains('dev-toolkit-info') ||
                e.target.classList.contains('dev-toolkit-overlay') ||
                e.target.classList.contains('dev-toolkit-color-popup')) {
                return;
            }

            // Get element under cursor
            const element = document.elementFromPoint(e.clientX, e.clientY);
            if (!element) return;

            let color = null;

            // Check if the element is an image
            if (element.tagName.toLowerCase() === 'img' && element.src) {
                color = sampleImageColor(element, e.clientX, e.clientY);
            }

            // If not an image or sampling failed, fall back to CSS colors
            if (!color) {
                const computedStyle = window.getComputedStyle(element);
                color = computedStyle.backgroundColor;

                // If background is transparent or none, fallback to text color
                if (color === 'rgba(0, 0, 0, 0)' || color === 'transparent' || color === 'none') {
                    color = computedStyle.color;
                }

                // If still no valid color, try parent element (fallback)
                if (color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
                    const parent = element.parentElement;
                    if (parent) {
                        const parentStyle = window.getComputedStyle(parent);
                        color = parentStyle.backgroundColor || parentStyle.color;
                    }
                }
            }

            // Ensure we have a valid color string (rgb, rgba, or hex-like)
            if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
                showToast('No valid color found at this location.');
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
                closeAllColorPickerPopups();
                toolkitState.colorPickerActive = false;
                showToast('All color picker popups closed.');
                document.removeEventListener('click', clickHandler, true);
                document.removeEventListener('keydown', keyHandler, true);
            }
        };

        // Attach event listeners
        document.addEventListener('click', clickHandler, true);
        document.addEventListener('keydown', keyHandler, true);

        // Store for cleanup
        toolkitState.eventListeners.push(
            { element: document, event: 'click', handler: clickHandler },
            { element: document, event: 'keydown', handler: keyHandler }
        );
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
            'Frontend Frameworks': [],
            'JavaScript Libraries': [],
            'CSS Frameworks': [],
            'Analytics & Tracking': [],
            'CDN & Hosting': [],
            'CMS & Platforms': [],
            'E-commerce Platforms': [],
            'Build Tools': [],
            'Development Tools': []
        };
        
        // Helper to avoid duplicates
        const addToStack = (category, item) => {
            if (!stack[category].includes(item)) {
                stack[category].push(item);
            }
        };
        
        // Check global objects
        if (window.React) addToStack('Frontend Frameworks', 'React');
        if (window.Vue) addToStack('Frontend Frameworks', 'Vue.js');
        if (window.angular) addToStack('Frontend Frameworks', 'Angular');
        if (window.Svelte) addToStack('Frontend Frameworks', 'Svelte');
        if (window.__NEXT_DATA__) addToStack('Frontend Frameworks', 'Next.js');
        if (window.__NUXT__) addToStack('Frontend Frameworks', 'Nuxt.js');
        if (window.jQuery || window.$) addToStack('JavaScript Libraries', 'jQuery');
        if (window._ || window.lodash) addToStack('JavaScript Libraries', 'Lodash');
        if (window.moment) addToStack('JavaScript Libraries', 'Moment.js');
        if (window.axios) addToStack('JavaScript Libraries', 'Axios');
        if (window.bootstrap) addToStack('CSS Frameworks', 'Bootstrap');
        if (window.ga || window.gtag) addToStack('Analytics & Tracking', 'Google Analytics');
        if (window.dataLayer) addToStack('Analytics & Tracking', 'Google Tag Manager');
        if (window.fbq) addToStack('Analytics & Tracking', 'Facebook Pixel');
        if (window.amplitude) addToStack('Analytics & Tracking', 'Amplitude');
        
        // Check meta tags
        document.querySelectorAll('meta').forEach(meta => {
            const name = meta.getAttribute('name');
            const content = meta.getAttribute('content');
            
            if (name === 'generator' && content) {
                if (content.toLowerCase().includes('wordpress')) {
                    addToStack('CMS & Platforms', 'WordPress');
                } else {
                    addToStack('CMS & Platforms', content);
                }
            }
            
            if (name === 'viewport') {
                addToStack('Development Tools', 'Responsive Design');
            }
        });
        
        // Check scripts and links
        document.querySelectorAll('script[src], link[href]').forEach(element => {
            const src = (element.src || element.href || '').toLowerCase();
            
            if (src.includes('cloudflare')) addToStack('CDN & Hosting', 'Cloudflare');
            if (src.includes('googleapis.com')) addToStack('CDN & Hosting', 'Google APIs');
            if (src.includes('jsdelivr.net')) addToStack('CDN & Hosting', 'jsDelivr');
            if (src.includes('unpkg.com')) addToStack('CDN & Hosting', 'UNPKG');
            if (src.includes('s3.amazonaws.com') || src.includes('amazonaws.com')) addToStack('CDN & Hosting', 'AWS S3');
            if (src.includes('vercel.app')) addToStack('CDN & Hosting', 'Vercel');
            if (src.includes('bootstrap')) addToStack('CSS Frameworks', 'Bootstrap');
            if (src.includes('tailwind')) addToStack('CSS Frameworks', 'Tailwind CSS');
            if (src.includes('fontawesome')) addToStack('CSS Frameworks', 'Font Awesome');
            if (src.includes('shopify')) addToStack('E-commerce Platforms', 'Shopify');
            if (src.includes('webpack')) addToStack('Build Tools', 'Webpack');
            if (src.includes('vite')) addToStack('Build Tools', 'Vite');
        });
        
        // Check for common libraries in script content
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join(' ').toLowerCase();
        if (scripts.includes('chart.js')) addToStack('JavaScript Libraries', 'Chart.js');
        if (scripts.includes('d3.js') || scripts.includes('d3.')) addToStack('JavaScript Libraries', 'D3.js');
        if (scripts.includes('three.js') || scripts.includes('three.')) addToStack('JavaScript Libraries', 'Three.js');
        if (scripts.includes('svelte')) addToStack('Frontend Frameworks', 'Svelte');
        
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
        const fullHtml = `<base href="${baseUrl}">` + document.documentElement.outerHTML;
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
            
            // Apply specific single view dimensions if provided
            if (viewType === 'mobile' && isMobile) {
                frame.classList.add('dev-toolkit-single-mobile-frame');
            } else if (viewType === 'desktop' && !isMobile) {
                frame.classList.add('dev-toolkit-single-desktop-frame');
            } else if (viewType === 'both') {
                // For 'both' view, use the default mobile/desktop frame sizes defined in CSS
                // or adjust if specific sizes are desired for the 'both' view
                if (isMobile) {
                    frame.style.width = '430px'; // Default mobile for both view
                    frame.style.height = '932px';
                } else {
                    frame.style.width = '1440px'; // Default desktop for both view
                    frame.style.height = '900px';
                }
            } else {
                // Fallback for single views if no specific class is added
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

        // Wait for iframes to load before syncing scroll
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
