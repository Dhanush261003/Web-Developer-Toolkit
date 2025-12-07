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
      // Capture the full page by stitching multiple screenshots
      await captureFullPage(tabs[0], options);
    } else {
      console.log("Unsupported screenshot type: ", options.type);
    }
  } catch (err) {
    console.error("Screenshot capture failed:", err);
    throw err;
  }
}

// Function to capture full page screenshot by scrolling and stitching
async function captureFullPage(tab, options) {
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

  // Get page dimensions and viewport info from the content script
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => ({
      scrollHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
      scrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio || 1,
    }),
  });
  const { scrollHeight, scrollWidth, viewportHeight, viewportWidth, devicePixelRatio } = result[0].result;

  // Calculate number of rows and columns needed to cover the entire page
  const rows = Math.ceil(scrollHeight / viewportHeight);
  const cols = Math.ceil(scrollWidth / viewportWidth);
  const screenshots = [];

  let fixedElementsHidden = false;

  // Loop through each section of the page
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * viewportWidth;
      const y = row * viewportHeight;

      // Hide fixed elements after the first screenshot to avoid duplication
      if (!fixedElementsHidden && row === 0 && col === 0) {
        // First screenshot - keep fixed elements
      } else if (!fixedElementsHidden) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            // Hide elements with fixed positioning to prevent them from appearing in every screenshot
            const fixedElements = document.querySelectorAll('*[style*="position: fixed"], *[style*="position:fixed"]');
            fixedElements.forEach(el => {
              el.style.display = 'none';
            });
            document.querySelectorAll('*').forEach(el => {
              const style = window.getComputedStyle(el);
              if (style.position === 'fixed') {
                el.style.display = 'none';
              }
            });
          },
        });
        fixedElementsHidden = true;
      }

      // Scroll to the current section
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: (scrollX, scrollY) => window.scrollTo({ left: scrollX, top: scrollY, behavior: 'smooth' }),
        args: [x, y],
      });

      // Wait for scrolling and rendering to complete
      await new Promise(r => setTimeout(r, 1200));

      // Capture the visible area
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: options.format || "png",
      });

      screenshots.push({ dataUrl, x, y, hasFixedElements: row === 0 && col === 0 });
    }
  }

  // Restore hidden fixed elements
  if (fixedElementsHidden) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Show the previously hidden fixed elements again
        document.querySelectorAll('*[style*="display: none"]').forEach(el => {
          el.style.display = '';
        });
      },
    });
  }

  // Create a canvas to stitch all screenshots together
  const canvas = new OffscreenCanvas(scrollWidth * devicePixelRatio, scrollHeight * devicePixelRatio);
  const ctx = canvas.getContext("2d");
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Draw each screenshot onto the canvas at the correct position
  for (const shot of screenshots) {
    const blob = await (await fetch(shot.dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    ctx.drawImage(bitmap, shot.x, shot.y);
  }

  // Convert the stitched canvas to a blob and then to data URL
  const blob = await canvas.convertToBlob({ type: `image/${options.format || "png"}` });
  const dataUrl = await blobToDataURL(blob);

  // Download the final full-page screenshot
  await chrome.downloads.download({
    url: dataUrl,
    filename: `fullpage-screenshot-${Date.now()}.${options.format || "png"}`,
    saveAs: true,
  });
}
/* End of background script */
