// Asset extractor functionality
function initAssetExtractor() {
    const extractBtn = document.getElementById('extractAssets');
    const includeImages = document.getElementById('includeImages');
    const includeVideos = document.getElementById('includeVideos');
    const includeSvgs = document.getElementById('includeSvgs');

    extractBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            showStatus('No active tab found to extract assets.');
            return;
        }

        try {
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'extractAssets',
                filters: {
                    includeImages: includeImages.checked,
                    includeVideos: includeVideos.checked,
                    includeSvgs: includeSvgs.checked
                }
            });

            if (response && response.assets) {
                displayAssets(response.assets);
            } else {
                showStatus('Asset extraction failed: No assets received.');
            }
        } catch (error) {
            showStatus('Asset extraction failed. Please refresh the page.');
        }
    });
}

function showAssetPreview(url, type, name) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
        position: relative;
        cursor: default;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #333;
    `;
    closeBtn.onclick = () => modal.remove();

    const title = document.createElement('h4');
    title.textContent = `${name} (${type})`;
    title.style.cssText = 'margin: 0 0 10px 0; font-size: 16px;';

    let previewElement;
    if (type === 'image' || type === 'svg' || type === 'background-image') {
        previewElement = document.createElement('img');
        previewElement.src = url;
        previewElement.style.cssText = 'max-width: 100%; max-height: 400px; display: block;';
        previewElement.onerror = () => {
            previewElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5IDE4VjE2QzYuOSAxNiA2IDE1LjEgNiAxNFY0QzYgMi45IDYuOSAyIDggMkgxNkMxNy4xIDIgMTggMi45IDE4IDRWMTJDMTggMTMuMSAxNy4xIDE0IDE2IDE0SDEyQzEwLjkgMTQgMTAgMTMuMSAxMCAxMloiIGZpbGw9IiM5OTk5OTkiLz4KPHBhdGggZD0iTTEyIDIwQzEzLjEgMjAgMTQgMTkuMSAxNCAxOFYxNkMxNCAxNC45IDEzLjEgMTQgMTIgMTRIMTBDOS45IDE0IDkgMTQuOSA5IDE2VjE4QzkgMTkuMSAxMC4xIDIwIDEyIDIwWiIgZmlsbD0iIzk5OTk5OSI+PC9wYXRoPgo8L3N2Zz4=';
        };
    } else if (type === 'video') {
        previewElement = document.createElement('video');
        previewElement.src = url;
        previewElement.controls = true;
        previewElement.style.cssText = 'max-width: 100%; max-height: 400px; display: block;';
        previewElement.onerror = () => {
            previewElement.outerHTML = '<p style="color: #999;">Video preview not available</p>';
        };
    } else {
        previewElement = document.createElement('p');
        previewElement.textContent = 'Preview not available for this asset type';
        previewElement.style.cssText = 'color: #999; font-style: italic;';
    }

    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(previewElement);
    modal.appendChild(content);

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
}

function displayAssets(assets) {
    const assetList = document.getElementById('assetList');
    assetList.innerHTML = '';

    if (assets.length === 0) {
        assetList.innerHTML = '<div style="font-size: 12px; color: #888; padding: 8px;">No assets found.</div>';
        return;
    }

    assets.forEach(asset => {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;';

        let thumbnail = '';
        if (asset.type === 'image' || asset.type === 'svg') {
            thumbnail = `<img src="${asset.url}" style="width: 24px; height: 24px; margin-right: 8px; object-fit: cover; border-radius: 3px; cursor: pointer;" alt="thumbnail" onclick="showAssetPreview('${asset.url}', '${asset.type}', '${asset.name}')">`;
        } else if (asset.type === 'video') {
            thumbnail = '<div style="width: 24px; height: 24px; margin-right: 8px; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 12px; border-radius: 3px; cursor: pointer;" onclick="showAssetPreview(\'' + asset.url + '\', \'' + asset.type + '\', \'' + asset.name + '\')">🎥</div>';
        } else {
            thumbnail = '<div style="width: 24px; height: 24px; margin-right: 8px; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 12px; border-radius: 3px; cursor: pointer;" onclick="showAssetPreview(\'' + asset.url + '\', \'' + asset.type + '\', \'' + asset.name + '\')">📄</div>';
        }

        item.innerHTML = `
            <div style="display: flex; align-items: center; flex: 1; cursor: pointer;" onclick="showAssetPreview('${asset.url}', '${asset.type}', '${asset.name}')">
                ${thumbnail}
                <span style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${asset.name} (${asset.type})</span>
            </div>
            <button class="preview-asset-btn" data-url="${asset.url}" data-type="${asset.type}" data-name="${asset.name}" style="padding: 4px 8px; font-size: 11px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 4px;">Preview</button>
            <button data-url="${asset.url}" class="download-asset-btn" style="padding: 4px 8px; font-size: 11px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Download</button>
        `;
        assetList.appendChild(item);
    });

    assetList.querySelectorAll('.download-asset-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const url = event.target.getAttribute('data-url');
            downloadAsset(url);
        });
    });

    assetList.querySelectorAll('.preview-asset-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const url = event.target.getAttribute('data-url');
            const type = event.target.getAttribute('data-type');
            const name = event.target.getAttribute('data-name');
            showAssetPreview(url, type, name);
        });
    });
}

async function downloadAsset(url) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabUrl = tab.url || window.location.href;

        let absoluteUrl = url;
        if (url.startsWith('/')) {
            const base = new URL(tabUrl).origin;
            absoluteUrl = base + url;
        } else if (!url.startsWith('http') && !url.startsWith('data:')) {
            absoluteUrl = new URL(url, tabUrl).href;
        }

        let filename = url.split('/').pop().split('?')[0] || 'asset';
        if (url.startsWith('data:')) {
            const mime = url.match(/data:([^;]+)/);
            const ext = mime ? mime[1].split('/')[1] || 'bin' : 'bin';
            filename = `data-asset.${ext}`;
        }

        chrome.downloads.download({
            url: absoluteUrl,
            filename: filename,
            saveAs: false
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                showStatus('Download failed: ' + chrome.runtime.lastError.message);
            } else if (downloadId) {
                showStatus('Download started: ' + filename + ' (saved to default folder)');
            } else {
                showStatus('Download completed.');
            }
        });
    } catch (error) {
        showStatus('Download failed: ' + error.message);
    }
}
// End of asset extractor functionality
