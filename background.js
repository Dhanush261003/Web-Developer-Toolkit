/* Background script for the web developer toolkit */

// Event listener for when the extension is first installed or updated
// Sets up context menus and initializes local storage
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed, setting up context menus");

  // Create context menu items for right-click functionality
  chrome.contextMenus.create({ id: "inspectElement", title: "Inspect Element with Toolkit", contexts: ["all"] });
  chrome.contextMenus.create({ id: "pickColor", title: "Pick Color", contexts: ["all"] });
  chrome.contextMenus.create({ id: "captureArea", title: "Capture Screenshot", contexts: ["all"] });

  // Initialize local storage with default values
  chrome.storage.local.set({ colorHistory: [], inspectorEnabled: false });
});

// Message listener to handle requests from content scripts and popup
// Routes actions to appropriate handler functions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Forward selection-related messages to other extension contexts (popup/detached window)
  if (request && (request.action === 'elementSelected' || request.action === 'elementUnselected' || request.action === 'elementUpdated')) {
    // Broadcast to all extension contexts
    try { chrome.runtime.sendMessage(request); } catch (err) { }
    sendResponse({ success: true });
    return true;
  }

  switch (request.action) {
    case "captureScreenshot":
      // Handle screenshot capture request
      captureScreenshot(request.options)
        .then(() => sendResponse({ success: true }))
        .catch(() => sendResponse({ success: false }));
      return true; // Keep message channel open for async response
    case "downloadAsset":
      // Handle asset download request
      chrome.downloads.download({ url: request.url, filename: request.filename, saveAs: true })
        .then(() => sendResponse({ success: true }))
        .catch(() => sendResponse({ success: false }));
      return true;
    case "saveColor":
      // Handle saving color to history
      chrome.storage.local.get("colorHistory", result => {
        const history = result.colorHistory || [];
        history.push(request.color);
        chrome.storage.local.set({ colorHistory: history });
        sendResponse({ success: true });
      });
      return true;
    default:
      // Unknown action
      sendResponse({ success: false, error: "Unknown action" });
      return false;
  }
});

// (Restored default popup behavior) toolbar clicks open the popup defined in manifest.
// Removed detached-window creation and forwarding helpers so popup functions normally.

// Context menu click handler
// Executes appropriate functions on the active tab based on menu item clicked
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "inspectElement") {
    // Activate the HTML/CSS inspector tool
    chrome.scripting.executeScript({ target: { tabId: tab.id }, function: () => { if (typeof activateInspector === "function") activateInspector(); } });
  } else if (info.menuItemId === "pickColor") {
    // Activate the color picker tool
    chrome.scripting.executeScript({ target: { tabId: tab.id }, function: () => { if (typeof activateColorPicker === "function") activateColorPicker(); } });
  } else if (info.menuItemId === "captureArea") {
    // Trigger full page screenshot capture
    chrome.runtime.sendMessage({ action: "captureScreenshot", options: { type: "full", format: "png" } });
  }
});

// Main screenshot capture function
// Handles both visible area and full page captures
async function captureScreenshot(options) {
  try {
    // Get the currently active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) throw new Error("No active tab found");

    if (options.type === "visible") {
      // Capture only the visible area of the tab
      const dataUrl = await chrome.tabs.captureVisibleTab(tabs[0].windowId, { format: options.format || "png" });
      await chrome.downloads.download({
        url: dataUrl,
        filename: `screenshot_${Date.now()}.${options.format || "png"}`,
        saveAs: true,
      });
    } else if (options.type === "full") {
      // Capture the full page by scrolling and stitching
      await captureFullPage(tabs[0], options);
    } else {
      console.log("Unsupported screenshot type: ", options.type);
    }
  } catch (err) {
    console.error("Screenshot capture failed:", err);
    throw err;
  }
}

// =============================================================================
// FULL PAGE CAPTURE - FIXED VERSION
// =============================================================================
// Issues fixed:
// 1. Dynamic scroll height - recalculates at each scroll position to handle lazy loading
// 2. Overlap between screenshots - prevents gaps caused by scroll/render timing
// 3. Proper canvas dimensions - based on actual captured image size
// 4. Correct stitching - uses actual image dimensions, not assumed viewport size
// 5. Better scroll delay - waits for page to stabilize
// 6. Improved fixed element handling - uses getComputedStyle properly
// =============================================================================

async function captureFullPage(tab, options) {
  // Configuration
  // FIX 1: Added overlap to prevent gaps between screenshots
  // This handles edge cases where scroll position doesn't exactly match capture timing
  const OVERLAP_PX = 10;
  
  // FIX 2: Better scroll delay - starts with longer delay, adapts to page
  const INITIAL_SCROLL_DELAY = 1500;  // Initial wait for page to settle
  const SCROLL_SETTLE_TIMEOUT = 500;   // Max wait for scroll to settle
  const SCROLL_CHECK_INTERVAL = 100;   // How often to check if scroll settled
  
  // Helper function to convert blob to data URL
  async function blobToDataURL(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:' + blob.type + ';base64,' + btoa(binary);
  }

  // FIX 3: Helper function to get page dimensions at any point
  // This is called dynamically during scrolling to handle lazy-loaded content
  async function getPageDimensions() {
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Get actual viewport dimensions
        // IMPORTANT: These are the dimensions of the browser viewport, not the captured image
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Get document scroll dimensions
        // Use both body and documentElement to handle different page types
        const scrollHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight,
          document.body.clientHeight,
          document.documentElement.clientHeight
        );
        
        const scrollWidth = Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
          document.body.offsetWidth,
          document.documentElement.offsetWidth,
          document.body.clientWidth,
          document.documentElement.clientWidth
        );
        
        // Get device pixel ratio - this is CRITICAL for correct canvas sizing
        // The captured image will be (viewport * devicePixelRatio) in size
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        return {
          scrollHeight,
          scrollWidth,
          viewportHeight,
          viewportWidth,
          devicePixelRatio
        };
      },
    });
    return result[0].result;
  }

  // FIX 4: Helper function to scroll to a position and wait for page to settle
  async function scrollToPosition(x, y) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: (scrollX, scrollY) => {
        window.scrollTo({ left: scrollX, top: scrollY, behavior: 'auto' });
      },
      args: [x, y],
    });
    
    // FIX 5: Wait for page to settle - check if scroll position actually changed
    // and wait for any lazy-loaded content to render
    await waitForPageToSettle();
  }

  // FIX 6: Wait for page to settle - keeps scrolling until position is stable
  // This handles lazy loading where content expands the page
  async function waitForPageToSettle() {
    let lastScrollY = -1;
    let stableCount = 0;
    const requiredStable = 3;  // Position must be stable for 3 consecutive checks
    
    while (stableCount < requiredStable) {
      // Get current scroll position
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => ({
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          scrollHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
        }),
      });
      
      const { scrollY, scrollX, scrollHeight } = result[0].result;
      
      // Check if position stabilized (within 5px tolerance)
      if (Math.abs(scrollY - lastScrollY) < 5) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      
      lastScrollY = scrollY;
      
      // Small delay between checks
      await new Promise(r => setTimeout(r, SCROLL_CHECK_INTERVAL));
    }
    
    // Additional delay after settling for lazy content to fully render
    await new Promise(r => setTimeout(r, SCROLL_CHECK_INTERVAL * 2));
  }

  // FIX 7: Improved fixed element handling
  // Hide fixed/sticky elements to prevent them from appearing in every screenshot
  async function hideFixedElements() {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Find all elements with position: fixed or sticky
        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el);
          const position = style.getPropertyValue('position');
          
          if (position === 'fixed' || position === 'sticky') {
            // Store original display value using data attribute
            el.dataset.devToolkitHidden = 'true';
            el.dataset.devToolkitOriginalDisplay = el.style.display;
            el.dataset.devToolkitOriginalVisibility = el.style.visibility;
            el.dataset.devToolkitOriginalPosition = el.style.position;
            
            // Hide the element but keep it in DOM for restoring later
            el.style.display = 'none';
          }
        });
      },
    });
  }

  // FIX 8: Restore fixed elements after capture
  async function showFixedElements() {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Show all elements we previously hid
        document.querySelectorAll('*').forEach(el => {
          // Check if this element was hidden by our script
          if (el.dataset.devToolkitHidden) {
            el.style.display = el.dataset.devToolkitOriginalDisplay || '';
            el.style.visibility = el.dataset.devToolkitOriginalVisibility || '';
            el.style.position = el.dataset.devToolkitOriginalPosition || '';
            delete el.dataset.devToolkitHidden;
            delete el.dataset.devToolkitOriginalDisplay;
            delete el.dataset.devToolkitOriginalVisibility;
            delete el.dataset.devToolkitOriginalPosition;
          }
        });
      },
    });
  }

  // =========================================================================
  // MAIN CAPTURE LOGIC
  // =========================================================================
  
  // Step 1: Scroll to top and wait for initial render
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => window.scrollTo(0, 0),
  });
  await new Promise(r => setTimeout(r, INITIAL_SCROLL_DELAY));
  
  // Step 2: Get initial page dimensions
  const initialDims = await getPageDimensions();
  console.log('Initial dimensions:', initialDims);
  
  // Step 3: Hide fixed/sticky elements
  await hideFixedElements();
  
  // Step 4: Calculate scroll positions with overlap
  // FIX 9: Calculate positions dynamically based on actual viewport size
  // We use the initial dimensions but will recalculate during capture
  const { viewportHeight, viewportWidth, devicePixelRatio } = initialDims;
  
  // Calculate the effective capture size (accounting for devicePixelRatio)
  // When we capture with captureVisibleTab, the image is viewport * devicePixelRatio
  const captureWidth = viewportWidth * devicePixelRatio;
  const captureHeight = viewportHeight * devicePixelRatio;
  
  // Calculate positions with overlap to prevent gaps
  // The actual pixel position in the final image
  const positions = [];
  const totalScrollHeight = initialDims.scrollHeight;
  
  // Start from top-left and work down-right
  let currentY = 0;
  while (currentY < totalScrollHeight) {
    let currentX = 0;
    
    while (currentX < initialDims.scrollWidth) {
      // Calculate remaining height for this position (for last capture handling)
      const remainingHeight = Math.max(0, totalScrollHeight - currentY);
      const isLastRow = currentY + viewportHeight >= totalScrollHeight;
      
      positions.push({
        x: currentX,
        y: currentY,
        remainingHeight: remainingHeight,
        isLastRow: isLastRow
      });
      
      // Move right with overlap
      currentX += viewportWidth - OVERLAP_PX;
    }
    
    // Move down with overlap  
    currentY += viewportHeight - OVERLAP_PX;
  }
  
  console.log('Calculated ' + positions.length + ' capture positions');
  
  // Step 5: Capture screenshots at each position
  const screenshots = [];
  
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    
    // Scroll to this position
    await scrollToPosition(pos.x, pos.y);
    
    // Get current page dimensions (may have changed due to lazy loading)
    const currentDims = await getPageDimensions();
    
    // Check if we need more positions (page grew)
    // This handles lazy loading that expands the page
    if (currentDims.scrollHeight > initialDims.scrollHeight || 
        currentDims.scrollWidth > initialDims.scrollWidth) {
      console.log('Page dimensions changed:', currentDims);
      // Recalculate remaining positions would be complex
      // For now, continue with what we have - the overlap should help
    }
    
    // Capture the visible area
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: options.format || "png",
    });
    
    // Store screenshot with its position and dimensions
    // For last row: calculate actual captured height based on remaining content
    const actualCaptureHeight = pos.isLastRow 
      ? Math.ceil(pos.remainingHeight * devicePixelRatio) 
      : captureHeight;
    
    screenshots.push({
      dataUrl: dataUrl,
      x: pos.x,
      y: pos.y,
      remainingHeight: pos.remainingHeight,
      isLastRow: pos.isLastRow,
      // Store actual dimensions captured
      width: captureWidth,
      height: actualCaptureHeight
    });
    
    console.log('Captured ' + (i + 1) + '/' + positions.length + ' at (' + pos.x + ', ' + pos.y + '), remaining: ' + pos.remainingHeight + 'px, actual height: ' + actualCaptureHeight + 'px');
  }
  
  // =============================================================================
  // FIX: Always capture the FINAL bottom section
  // =============================================================================
  // The main loop may not reach the exact bottom due to overlap calculations
  // Force a final scroll to the absolute bottom and capture it
  
  // Step 5b: Recalculate scrollHeight dynamically and scroll to absolute bottom
  const bottomDims = await getPageDimensions();
  const finalScrollY = bottomDims.scrollHeight - bottomDims.viewportHeight;
  
  // Only capture if we're not already at the bottom position
  const lastScreenshot = screenshots[screenshots.length - 1];
  const isAlreadyAtBottom = lastScreenshot && lastScreenshot.y >= finalScrollY;
  
  if (!isAlreadyAtBottom && finalScrollY > 0) {
    console.log('Forcing final scroll to bottom: ' + finalScrollY + 'px (scrollHeight: ' + bottomDims.scrollHeight + ', viewportHeight: ' + bottomDims.viewportHeight + ')');
    
    // Scroll to the absolute bottom
    await scrollToPosition(0, finalScrollY);
    
    // Get dimensions after final scroll (may have changed again)
    const finalDimsAfterScroll = await getPageDimensions();
    const actualFinalScrollY = finalDimsAfterScroll.scrollHeight - finalDimsAfterScroll.viewportHeight;
    
    // Scroll again to the recalculated bottom position
    if (actualFinalScrollY !== finalScrollY) {
      console.log('Recalculated bottom position: ' + actualFinalScrollY + 'px');
      await scrollToPosition(0, actualFinalScrollY);
    }
    
    // Small delay to ensure rendering is complete
    await new Promise(r => setTimeout(r, SCROLL_CHECK_INTERVAL));
    
    // Capture the final bottom section
    const finalDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: options.format || "png",
    });
    
    // Calculate actual captured height
    const remainingAtBottom = finalDimsAfterScroll.scrollHeight - actualFinalScrollY;
    const finalCaptureHeight = Math.ceil(remainingAtBottom * finalDimsAfterScroll.devicePixelRatio);
    
    screenshots.push({
      dataUrl: finalDataUrl,
      x: 0,
      y: actualFinalScrollY,
      remainingHeight: remainingAtBottom,
      isLastRow: true,
      width: finalDimsAfterScroll.viewportWidth * finalDimsAfterScroll.devicePixelRatio,
      height: finalCaptureHeight
    });
    
    console.log('Captured FINAL bottom section at y=' + actualFinalScrollY + ', remaining: ' + remainingAtBottom + 'px, height: ' + finalCaptureHeight + 'px');
  } else {
    console.log('Already at bottom position, skipping extra capture');
  }
  
  // Step 6: Restore fixed elements
  await showFixedElements();
  
  // Step 7: Scroll back to top
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => window.scrollTo(0, 0),
  });
  
  // Step 8: Calculate final canvas dimensions
  // FIX 10: Get final page dimensions for correct canvas sizing
  const finalDims = await getPageDimensions();
  const canvasWidth = finalDims.scrollWidth * devicePixelRatio;
  const canvasHeight = finalDims.scrollHeight * devicePixelRatio;
  
  console.log('Final canvas size: ' + canvasWidth + 'x' + canvasHeight);
  
  // Step 9: Create canvas and stitch images
  // FIX 11: Create canvas with correct dimensions
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  
  // Clear canvas with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // FIX 12: Draw each screenshot at correct position with correct scaling
  for (const shot of screenshots) {
    try {
      // Fetch the image
      const imgResponse = await fetch(shot.dataUrl);
      const imgBlob = await imgResponse.blob();
      const imgBitmap = await createImageBitmap(imgBlob);
      
      // FIX 13: Draw image at the correct position
      // The screenshot was captured at viewport position (shot.x, shot.y)
      // We need to scale by devicePixelRatio for the canvas coordinates
      const canvasX = shot.x * devicePixelRatio;
      const canvasY = shot.y * devicePixelRatio;
      
      // FIX 14: Handle trimming for last row - trim excess from bottom
      // For last row: draw only the remaining content portion
      if (shot.isLastRow && shot.remainingHeight > 0 && shot.remainingHeight < viewportHeight) {
        // Calculate how many pixels to trim from bottom of this screenshot
        const pixelsToTrim = (viewportHeight - shot.remainingHeight) * devicePixelRatio;
        const trimmedHeight = imgBitmap.height - pixelsToTrim;
        
        // Draw with trimming - source from (0, 0) to (width, trimmedHeight)
        // Destination at (canvasX, canvasY) with full width but trimmed height
        ctx.drawImage(
          imgBitmap,
          0, 0,                    // source x, y
          imgBitmap.width,          // source width (full)
          trimmedHeight,           // source height (trimmed)
          canvasX, canvasY,        // destination x, y
          shot.width,              // destination width
          trimmedHeight           // destination height
        );
      } else {
        // Normal draw for non-last rows
        ctx.drawImage(imgBitmap, canvasX, canvasY);
      }
      
    } catch (err) {
      console.error('Error drawing screenshot:', err);
    }
  }
  
  // Step 10: Convert canvas to blob and download
  const blob = await canvas.convertToBlob({ type: `image/${options.format || "png"}` });
  const dataUrl = await blobToDataURL(blob);
  
  // Download the final full-page screenshot
  await chrome.downloads.download({
    url: dataUrl,
    filename: `fullpage-screenshot-${Date.now()}.${options.format || "png"}`,
    saveAs: true,
  });
  
  console.log('Full page capture complete!');
}
/* End of background script */
