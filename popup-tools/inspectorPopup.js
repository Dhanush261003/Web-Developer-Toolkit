// Inspector functionality
function initInspector() {
    const toggleBtn = document.getElementById('toggleInspector');
    const showPseudoCheckbox = document.getElementById('showPseudo');
    const showMediaCheckbox = document.getElementById('showMediaQueries');
    const liveEditCheckbox = document.getElementById('enableLiveEdit');
    let inspectorActive = false;
    let selectedElement = null;
    let selectedElementStyles = {};

    function updateToggleButton(isActive) {
        inspectorActive = isActive;
        toggleBtn.textContent = inspectorActive ? 'Deactivate Inspector' : 'Toggle Inspector';
        toggleBtn.style.background = inspectorActive ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : '';
    }

    async function getInitialInspectorState() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url || (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
                updateToggleButton(false);
                return;
            }

            // Check if content script is ready before sending messages
            const isReady = await checkContentScriptReady(tab.id);
            if (!isReady) {
                updateToggleButton(false);
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getInspectorState' });
            if (response && typeof response.inspectorActive === 'boolean') {
                updateToggleButton(response.inspectorActive);
            } else {
                updateToggleButton(false);
            }
        } catch (error) {
            console.log('Error getting inspector state:', error);
            if (error && error.message && (error.message.includes('Could not establish connection') || error.message.includes('Receiving end does not exist'))) {
                updateToggleButton(false);
            } else {
                showStatus('Could not get inspector state. Please refresh the page.');
            }
        }
    }
    getInitialInspectorState();
    getInitialInspectorOptions();

    // Send inspector option updates when checkboxes change
    if (showPseudoCheckbox) {
        showPseudoCheckbox.addEventListener('change', sendOptions);
    }
    if (showMediaCheckbox) {
        showMediaCheckbox.addEventListener('change', sendOptions);
    }
    if (liveEditCheckbox) {
        liveEditCheckbox.addEventListener('change', sendOptions);
    }

    async function sendOptions() {
        const options = {
            showPseudo: !!(showPseudoCheckbox && showPseudoCheckbox.checked),
            showMediaQueries: !!(showMediaCheckbox && showMediaCheckbox.checked),
            enableLiveEdit: !!(liveEditCheckbox && liveEditCheckbox.checked)
        };
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            // Check if content script is ready before sending messages
            const isReady = await checkContentScriptReady(tab.id);
            if (!isReady) return;

            await chrome.tabs.sendMessage(tab.id, { action: 'setInspectorOptions', options });
        } catch (err) {
            console.log('Failed to send inspector options:', err);
            // ignore if no connection
        }
    }

    // Get initial options from content script and update checkboxes
    async function getInitialInspectorOptions() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getInspectorOptions' });
            if (response && response.options) {
                if (showPseudoCheckbox) showPseudoCheckbox.checked = !!response.options.showPseudo;
                if (showMediaCheckbox) showMediaCheckbox.checked = !!response.options.showMediaQueries;
                if (liveEditCheckbox) liveEditCheckbox.checked = !!response.options.enableLiveEdit;
            }
        } catch (err) {
            // ignore
        }
    }

    // Setup Live CSS Editor
    setupLiveCSSEditor();
    
    // Setup Console Panel
    setupConsolePanel();

    // Enable wheel scrolling on all scrollable containers
    function enableWheelScroll(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.addEventListener('wheel', (e) => {
            // Let the browser handle default scrolling
            e.preventDefault();
            // Manually scroll since preventDefault blocks default behavior
            container.scrollTop += (e.deltaY > 0 ? 30 : -30); // Scroll 30px per wheel tick
        }, { passive: false });
    }
    
    enableWheelScroll('selectedEditor');
    enableWheelScroll('liveCSSEditor');
    enableWheelScroll('consolePanel');

    // Create container for the selected element editor (below the Live CSS Editor)
    function ensureSelectedEditorContainer() {
        let container = document.getElementById('selectedEditor');
        if (container) return container;

        // Find the best insertion point - prefer console panel, then live editor, then status div
        let insertAfter = document.getElementById('consolePanel') ||
                         document.getElementById('liveCSSEditor') ||
                         document.querySelector('[role="status"]');

        if (!insertAfter) {
            // Last resort: find any existing toolkit element
            const toolkitElements = document.querySelectorAll('[id*="toolkit"], [id*="console"], [id*="live"]');
            insertAfter = toolkitElements[toolkitElements.length - 1];
        }

        if (!insertAfter) {
            // Ultimate fallback: insert at the end of body
            insertAfter = document.body;
        }

        container = document.createElement('div');
        container.id = 'selectedEditor';
        container.style.marginTop = '10px';
        container.style.marginBottom = '10px';
        container.style.padding = '10px';
        container.style.border = '1px solid #3e3e42';
        container.style.borderRadius = '4px';
        container.style.background = '#252526';
        container.style.maxHeight = '350px';
        container.style.overflowY = 'auto';
        container.style.pointerEvents = 'auto';
        container.style.display = 'block';
        container.innerHTML = '<div style="font-weight: bold; margin-bottom: 8px; font-size: 12px; color: #e0e0e0;">Selected Element</div><div id="selectedEditorContent" style="color:#cfcfcf; font-size:12px; pointer-events: auto;"></div>';

        if (insertAfter === document.body) {
            insertAfter.appendChild(container);
        } else {
            insertAfter.insertAdjacentElement('afterend', container);
        }



        return container;
    }

    // Helper: convert rgb(...) to hex
    function rgbToHex(rgb) {
        if (!rgb || typeof rgb !== 'string') return rgb || '';
        const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (!m) return rgb;
        const r = parseInt(m[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(m[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(m[3], 10).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    // Helper: normalize values before sending to content script
    function normalizeValue(prop, raw) {
        if (raw === null || raw === undefined) return raw;
        let v = raw.toString().trim();

        // For numeric-only inputs, append px for common properties
        const pxProps = ['fontSize','width','height','margin','padding','borderRadius','gap','letterSpacing'];
        if (pxProps.includes(prop)) {
            // If multiple values (e.g., "10 20"), only append px to numeric tokens
            if (v.indexOf(' ') !== -1) {
                v = v.split(/\s+/).map(tok => (/^[0-9.]+$/.test(tok) ? tok + 'px' : tok)).join(' ');
            } else if (/^[0-9.]+$/.test(v)) {
                v = v + 'px';
            }
        }

        // Normalize fontWeight numeric strings to simple values
        if (prop === 'fontWeight' && /^[0-9]+$/.test(v)) {
            // keep numeric or common keywords
        }

        // Colors: allow hex or rgb; convert rgb to hex for color input
        if (prop === 'color' || prop === 'backgroundColor') {
            if (v.startsWith('rgb')) {
                v = rgbToHex(v);
            }
        }

        return v;
    }

    // Render the selected element property panel
    function renderSelectedElementPanel(info) {
        const container = ensureSelectedEditorContainer();
        if (!container) {
            console.error('Failed to create selected editor container');
            return;
        }
        const content = container.querySelector('#selectedEditorContent');
        if (!info) {
            content.innerHTML = '<div style="color:#9a9a9a;">No element selected. Click an element on the page to select it.</div>';
            selectedElement = null;
            // Hide the container when no element is selected
            container.style.display = 'none';
            return;
        }

        // Ensure container is visible when element is selected
        container.style.display = 'block';

        selectedElement = info; // store last info snapshot

        // Define sections and properties to display
        const sections = [
            { title: 'Typography', props: ['fontSize','fontWeight','lineHeight','color','fontFamily','letterSpacing','textAlign'] }
        ];

        let html = `<div style="font-size:12px;color:#e0e0e0;margin-bottom:8px;">&lt;${escapeHtml(info.tagName)}&gt; <span style='color:#9a9a9a;'>${escapeHtml(info.className)}</span></div>`;

        sections.forEach(section => {
            // Skip flex/grid if not applicable
            if (section.title === 'Flex / Grid' && !(info.display && (info.display.includes('flex') || info.display.includes('grid')))) {
                return;
            }

            html += `<div style="margin-bottom:8px;"><div style="color:#858585;font-size:11px;margin-bottom:6px;text-transform:uppercase;">${section.title}</div>`;
            section.props.forEach(prop => {
                const val = info[prop] !== undefined && info[prop] !== null ? info[prop] : '';
                // Choose input type
                if (prop === 'color' || prop === 'backgroundColor') {
                    const safeVal = val && val.startsWith('rgb') ? '' : val; // color input prefers hex
                    // Only show color input if there's an actual value to prevent default black
                    const colorInputHtml = safeVal ? `<input class="inspector-edit" data-property="${prop}" type="color" value="${safeVal}" style="margin-right:8px;pointer-events:auto;cursor:pointer;">` : `<input class="inspector-edit" data-property="${prop}" type="color" disabled style="margin-right:8px;pointer-events:auto;cursor:not-allowed;opacity:0.5;">`;
                    html += `
                        <div style="display:flex;align-items:center;margin-bottom:6px;">
                            <div style="width:120px;color:#cfcfcf;font-size:12px;">${prop}</div>
                            ${colorInputHtml}
                            <input class="inspector-edit" data-property="${prop}" type="text" value="${escapeHtml(val)}" placeholder="Click here to set ${prop}" style="flex:1;padding:4px;border-radius:3px;background:#2d2d30;border:1px solid #3e3e42;color:#cfcfcf;pointer-events:auto;cursor:text;">
                        </div>`;
                } else if (prop === 'display' || prop === 'position' || prop === 'textAlign' || prop === 'fontWeight' || prop === 'flexDirection' || prop === 'justifyContent' || prop === 'alignItems') {
                    // simple select for these
                    const options = {
                        display: ['block','inline','inline-block','flex','grid','none'],
                        position: ['static','relative','absolute','fixed','sticky'],
                        fontWeight: ['100','200','300','400','500','600','700','800','900','normal','bold'],
                        flexDirection: ['row','column','row-reverse','column-reverse'],
                        justifyContent: ['flex-start','center','flex-end','space-between','space-around'],
                        alignItems: ['stretch','flex-start','center','flex-end'],
                        textAlign: ['left','center','right','justify']
                    };
                    const opts = options[prop] || [];
                    html += `<div style="display:flex;align-items:center;margin-bottom:6px;"><div style="width:120px;color:#cfcfcf;font-size:12px;">${prop}</div><select class="inspector-edit" data-property="${prop}" style="flex:1;padding:6px;border-radius:3px;background:#2d2d30;border:1px solid #3e3e42;color:#cfcfcf;pointer-events:auto;cursor:pointer;">`;
                    opts.forEach(o => {
                        const sel = (val && val.toString().includes(o)) ? 'selected' : '';
                        html += `<option value="${o}" ${sel}>${o}</option>`;
                    });
                    html += `</select></div>`;
                } else if (prop === 'width' || prop === 'height' || prop === 'margin' || prop === 'padding' || prop === 'border' || prop === 'borderRadius' || prop === 'gap' || prop === 'fontSize' || prop === 'lineHeight' || prop === 'fontFamily') {
                    html += `<div style="display:flex;align-items:center;margin-bottom:6px;"><div style="width:120px;color:#cfcfcf;font-size:12px;">${prop}</div><input class="inspector-edit" data-property="${prop}" type="text" value="${escapeHtml(val)}" style="flex:1;padding:6px;border-radius:3px;background:#2d2d30;border:1px solid #3e3e42;color:#cfcfcf;pointer-events:auto;cursor:text;"></div>`;
                } else {
                    html += `<div style="display:flex;align-items:center;margin-bottom:6px;"><div style="width:120px;color:#cfcfcf;font-size:12px;">${prop}</div><input class="inspector-edit" data-property="${prop}" type="text" value="${escapeHtml(val)}" style="flex:1;padding:6px;border-radius:3px;background:#2d2d30;border:1px solid #3e3e42;color:#cfcfcf;pointer-events:auto;cursor:text;"></div>`;
                }
            });
            html += `</div>`;
        });

        // Add a quick unselect button
        html += `<div style="display:flex;gap:8px;margin-top:8px;"><button id="inspector-unselect" style="flex:1;padding:8px;border-radius:4px;background:#b91c1c;color:white;border:none;pointer-events:auto;cursor:pointer;">Unselect</button></div>`;

        content.innerHTML = html;

        // Wire media-query toggles using event delegation
        content.addEventListener('click', (ev) => {
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

        // Wire up input events (debounced)
        const inputs = content.querySelectorAll('.inspector-edit');
        const debounceMap = new Map();
        inputs.forEach(inp => {
            // Skip disabled inputs
            if (inp.disabled) return;
            
            const prop = inp.dataset.property;
            const sendChange = (value, inputEl) => {
                // Don't send if disabled
                if (inputEl && (inputEl.disabled || inputEl.readOnly)) return;

                // Send empty value to remove style
                let normalized = '';
                if (value && value.toString().trim() !== '') {
                    // Special handling for backgroundColor: never apply transparent or rgba(0,0,0,0)
                    if (prop === 'backgroundColor' && (value === 'transparent' || value === 'rgba(0,0,0,0)' || value === 'rgba(0, 0, 0, 0)')) {
                        normalized = '';
                    } else {
                        // normalize before sending
                        normalized = normalizeValue(prop, value);

                        // Special handling: if color input exists and user typed text, prefer text when it contains '#'
                        if ((prop === 'color' || prop === 'backgroundColor') && inputEl) {
                            // if inputEl is text and contains '#', use it; if it's color input, normalized is hex already
                            if (inputEl.type === 'text' && inputEl.value && inputEl.value.startsWith('#')) {
                                normalized = inputEl.value.trim();
                            }
                            // Prevent default black color (#000000) from being applied
                            if (inputEl.type === 'color' && normalized === '#000000') {
                                return;
                            }
                        }
                    }
                }

                // send to content script via active tab (empty string will remove the property)
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (!tabs || !tabs[0]) return;
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'applyStyleToSelected', property: prop, value: normalized }, () => {});
                });
            };

            const handler = (e) => {
                // Skip if input is disabled or readonly
                if (e.target.disabled || e.target.readOnly) return;
                
                const v = e.target.value;
                if (debounceMap.has(prop)) clearTimeout(debounceMap.get(prop));
                debounceMap.set(prop, setTimeout(() => sendChange(v, e.target), 120));
                // If this is a color text input, try to update color input sibling
                if (e.target.type === 'text' && (prop === 'color' || prop === 'backgroundColor')) {
                    const row = e.target.closest('div');
                    if (row) {
                        const colorInput = row.querySelector('input[type="color"]');
                        if (colorInput) {
                            if (e.target.value && e.target.value.startsWith('#')) {
                                try { 
                                    colorInput.disabled = false;
                                    colorInput.style.opacity = '1';
                                    colorInput.style.cursor = 'pointer';
                                    colorInput.value = e.target.value; 
                                } catch (err) { }
                            } else if (!e.target.value) {
                                colorInput.disabled = true;
                                colorInput.style.opacity = '0.5';
                                colorInput.style.cursor = 'not-allowed';
                            }
                        }
                    }
                }
            };

            inp.addEventListener('input', handler);
            inp.addEventListener('change', handler);
        });

        const unselectBtn = content.querySelector('#inspector-unselect');
        if (unselectBtn) {
            unselectBtn.addEventListener('click', () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (!tabs || !tabs[0]) return;
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'unpinSelectedElement' }, (resp) => {
                        renderSelectedElementPanel(null);
                    });
                });
            });
        }
    }

    // Request current selected element info from content script
    async function requestSelectedInfo() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) { renderSelectedElementPanel(null); return; }
        try {
            // Check if content script is ready before sending messages
            const isReady = await checkContentScriptReady(tab.id);
            if (!isReady) {
                renderSelectedElementPanel(null);
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedElementInfo' });
            if (response && response.info) renderSelectedElementPanel(response.info);
            else renderSelectedElementPanel(null);
        } catch (err) {
            renderSelectedElementPanel(null);
        }
    }

    // Listen for selection events from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'elementSelected') {
            renderSelectedElementPanel(request.info);
        } else if (request.action === 'elementUnselected') {
            renderSelectedElementPanel(null);
        } else if (request.action === 'elementUpdated') {
            // refresh panel with updated info
            renderSelectedElementPanel(request.info);
        }
    });

    // Populate initial selection if any
    requestSelectedInfo();

    // Also check local storage for persisted selection
    chrome.storage.local.get(['selectedElementInfo'], (result) => {
        if (result.selectedElementInfo) {
            renderSelectedElementPanel(result.selectedElementInfo);
        }
    });

    toggleBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) { showStatus('No active tab found to toggle inspector.'); return; }
        try {
            // Check if content script is ready before sending messages
            const isReady = await checkContentScriptReady(tab.id);
            if (!isReady) {
                showStatus('Content script not ready. Please refresh the page.');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleInspector' });
            if (response && typeof response.inspectorActive === 'boolean') updateToggleButton(response.inspectorActive);
            else showStatus('Inspector toggle failed: Invalid response from content script.');
        } catch (error) {
            showStatus('Inspector failed to toggle. Please refresh the page.');
        }
    });
}

// Live CSS Editor
function setupLiveCSSEditor() {
    const editorHTML = `
        <div id="liveCSSEditor" style="margin-top: 10px; padding: 10px; border: 1px solid #3e3e42; border-radius: 4px; background: #252526;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px; color: #e0e0e0;">Live CSS Editor</div>
            <input type="text" id="cssProperty" placeholder="Property (e.g., color, backgroundColor)" style="width: 100%; padding: 6px; margin-bottom: 6px; box-sizing: border-box; background: #2d2d30; border: 1px solid #3e3e42; border-radius: 3px; color: #cccccc; font-size: 12px;">
            <input type="text" id="cssValue" placeholder="Value (e.g., red, #ff0000)" style="width: 100%; padding: 6px; margin-bottom: 8px; box-sizing: border-box; background: #2d2d30; border: 1px solid #3e3e42; border-radius: 3px; color: #cccccc; font-size: 12px;">
            <div style="display: flex; gap: 8px;">
                <button id="cssOkBtn" style="flex: 1; padding: 6px 12px; background-color: #15803d; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 11px; transition: all 0.15s;">OK</button>
                <button id="cssClearBtn" style="flex: 1; padding: 6px 12px; background-color: #b91c1c; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 11px; transition: all 0.15s;">Clear</button>
                <button id="cssClearAllBtn" style="flex: 1; padding: 6px 12px; background-color: #dc2626; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 11px; transition: all 0.15s;">Clear All</button>
            </div>
        </div>
    `;
    
    // Insert before the end of the main container
    const statusDiv = document.querySelector('[role="status"]');
    if (statusDiv && statusDiv.parentNode) {
        statusDiv.insertAdjacentHTML('afterend', editorHTML);
        
        const propertyInput = document.getElementById('cssProperty');
        const valueInput = document.getElementById('cssValue');
        const okBtn = document.getElementById('cssOkBtn');
        const clearBtn = document.getElementById('cssClearBtn');
        const clearAllBtn = document.getElementById('cssClearAllBtn');
        
        const applyCSS = async () => {
            const property = propertyInput.value.trim();
            const value = valueInput.value.trim();
            
            if (!property || !value) {
                return;
            }
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;
            
            try {
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'applyLiveCSS',
                    property: property,
                    value: value
                });
                
                if (response && response.success) {
                    propertyInput.value = '';
                    valueInput.value = '';
                }
            } catch (err) {
                // ignore
            }
        };
        
        okBtn.addEventListener('click', applyCSS);
        clearBtn.addEventListener('click', () => {
            propertyInput.value = '';
            valueInput.value = '';
        });
        clearAllBtn.addEventListener('click', async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;
            try {
                await chrome.tabs.sendMessage(tab.id, { action: 'clearLiveCSS' });
            } catch (err) {
                // ignore
            }
        });

        valueInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyCSS();
            }
        });
    }
}

// Console Panel
function setupConsolePanel() {
    const consoleHTML = `
        <div id="consolePanel" style="margin-top: 10px; padding: 10px; border: 1px solid #3e3e42; border-radius: 4px; max-height: 180px; overflow-y: auto; background: #252526; font-family: 'Courier New', monospace; font-size: 11px;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #e0e0e0;">Console Logs</div>
            <div id="consoleLogs" style="height: 130px; overflow-y: auto; background: #1e1e1e; padding: 6px; border-radius: 3px; border: 1px solid #3e3e42; color: #cccccc;"></div>
        </div>
    `;
    
    const editorDiv = document.getElementById('liveCSSEditor');
    if (editorDiv) {
        editorDiv.insertAdjacentHTML('afterend', consoleHTML);
        
        const consoleLogs = document.getElementById('consoleLogs');
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'logToPopupConsole') {
                const timestamp = new Date().toLocaleTimeString();
                const logEntry = document.createElement('div');
                logEntry.style.padding = '3px 0';
                logEntry.style.borderBottom = '1px solid #3e3e42';
                logEntry.style.color = '#858585';
                logEntry.innerHTML = `<span style="color: #858585;">[${timestamp}]</span> ${escapeHtml(request.message)}`;
                consoleLogs.appendChild(logEntry);
                consoleLogs.scrollTop = consoleLogs.scrollHeight;
            }
        });
    }
}

// Helper function to check if content script is ready
async function checkContentScriptReady(tabId) {
    const maxRetries = 3;
    const delay = 500; // 500ms delay between retries

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            if (response && response.pong === true) {
                return true;
            }
        } catch (error) {
            console.log(`Content script not ready (attempt ${attempt}/${maxRetries}):`, error);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return false;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

