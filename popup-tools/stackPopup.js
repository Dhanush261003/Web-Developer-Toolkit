// Tech stack detection functionality
function initStackDetection() {
    const analyzeBtn = document.getElementById('analyzeStack');

    analyzeBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            showStatus('No active tab found to detect tech stack.');
            return;
        }

        try {
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'detectTechStack'
            });

            if (response && response.stack) {
                displayStackResults(response.stack);
            } else {
                showStatus('Tech stack detection failed: No stack received.');
            }
        } catch (error) {
            showStatus('Tech stack detection failed. Please refresh the page.');
        }
    });
}

function displayStackResults(stack) {
    const resultsContainer = document.getElementById('stackResults');
    resultsContainer.innerHTML = '';

    const categoryIcons = {
        'Frontend Frameworks': '🛠️',
        'JavaScript Libraries': '📚',
        'CSS Frameworks': '🎨',
        'Analytics & Tracking': '📊',
        'CDN & Hosting': '🌐',
        'CMS & Platforms': '📄',
        'E-commerce Platforms': '🛒',
        'Build Tools': '⚙️',
        'Development Tools': '🔧'
    };

    let hasContent = false;
    Object.keys(stack).forEach(category => {
        if (stack[category] && stack[category].length > 0) {
            hasContent = true;
            const categoryDiv = document.createElement('div');
            categoryDiv.style.marginBottom = '12px';
            const icon = categoryIcons[category] || '📦';
            categoryDiv.innerHTML = `
                <h5 style="margin-bottom: 6px; color: #858585; font-size: 12px; text-transform: uppercase;">
                    ${icon} ${category}
                </h5>
                <div style="font-size: 13px;">
                    ${stack[category].map(item => `<span style="display: inline-block; background: #2d2d30; color: #e0e0e0; padding: 2px 6px; margin: 2px; border-radius: 3px; font-size: 11px; border: 1px solid #3e3e42;">${item}</span>`).join('')}
                </div>
            `;
            resultsContainer.appendChild(categoryDiv);
        }
    });

    if (!hasContent) {
        resultsContainer.innerHTML = '<div style="font-size: 12px; color: #888; padding: 8px;">No specific technologies detected.</div>';
    }
}
// End of tech stack detection functionality
