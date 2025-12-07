// SEO analyzer functionality
function initSEOAnalyzer() {
    const analyzeBtn = document.getElementById('analyzeSEO');

    analyzeBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            showStatus('No active tab found to analyze SEO.');
            return;
        }

        try {
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'analyzeSEO'
            });

            if (response && response.seo) {
                displaySEOResults(response.seo);
            } else {
                showStatus('SEO analysis failed: No SEO data received.');
            }
        } catch (error) {
            showStatus('SEO analysis failed. Please refresh the page.');
        }
    });
}

function displaySEOResults(seo) {
    const resultsContainer = document.getElementById('seoResults');
    resultsContainer.innerHTML = '';

    if (Object.keys(seo).length === 0 || !seo.basics) {
        resultsContainer.innerHTML = '<div style="font-size: 12px; color: #888; padding: 8px;">No SEO data available.</div>';
        return;
    }

    const scoreDiv = document.createElement('div');
    scoreDiv.style.marginBottom = '12px';
    scoreDiv.style.padding = '8px';
    scoreDiv.style.background = seo.score >= 90 ? '#d4edda' : seo.score >= 70 ? '#fff3cd' : '#f8d7da';
    scoreDiv.style.borderRadius = '4px';
    scoreDiv.style.borderLeft = `4px solid ${seo.score >= 90 ? '#28a745' : seo.score >= 70 ? '#ffc107' : '#dc3545'}`;
    scoreDiv.innerHTML = `<strong style="font-size: 14px;">SEO Score: ${seo.score}/100</strong>`;
    resultsContainer.appendChild(scoreDiv);

    const categories = [
        { key: 'basics', name: 'Basic SEO' },
        { key: 'content', name: 'Content SEO' },
        { key: 'technical', name: 'Technical SEO' },
        { key: 'social', name: 'Social SEO' }
    ];

    categories.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.style.marginBottom = '16px';
        catDiv.innerHTML = `<h5 style="margin: 0 0 8px 0; color: #666; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px;">${cat.name}</h5>`;

        const catData = seo[cat.key];
        if (catData && Object.keys(catData).length > 0) {
            for (const metricKey in catData) {
                const metric = catData[metricKey];
                const item = document.createElement('div');
                item.style.marginBottom = '6px';
                item.style.padding = '4px';
                item.style.borderRadius = '3px';
                item.style.background = metric.status === 'good' ? '#f8f9fa' : metric.status === 'warning' ? '#fff3cd' : '#f8d7da';

                let icon = metric.status === 'good' ? '✅' : metric.status === 'warning' ? '⚠️' : '❌';
                let statusColor = metric.status === 'good' ? '#28a745' : metric.status === 'warning' ? '#ffc107' : '#dc3545';

                let displayValue = metric.value;
                if (metricKey === 'headings' && typeof metric.value === 'object') {
                    displayValue = `H1: ${metric.value.h1}, H2: ${metric.value.h2}, H3: ${metric.value.h3}, H4+: ${metric.value.h4 + metric.value.h5 + metric.value.h6}`;
                } else if (metricKey === 'openGraph' || metricKey === 'twitterCard') {
                    displayValue = Object.entries(metric.value).map(([k, v]) => `${k}: ${v}`).join(', ');
                } else if (metricKey === 'pageLoadTime') {
                    displayValue = `${metric.value} (${metric.message})`;
                }

                item.innerHTML = `
                    <span style="color: ${statusColor}; font-size: 12px; margin-right: 6px;">${icon}</span>
                    <strong style="font-size: 12px; color: #333;">${metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>
                    <span style="font-size: 12px; color: #666; margin-left: 8px;">${displayValue}</span>
                `;
                catDiv.appendChild(item);
            }
        } else {
            catDiv.innerHTML += '<div style="font-size: 12px; color: #888;">No data</div>';
        }

        resultsContainer.appendChild(catDiv);
    });

    if (seo.recommendations && seo.recommendations.length > 0) {
        const recSection = document.createElement('div');
        recSection.style.marginTop = '16px';
        recSection.innerHTML = '<h5 style="margin: 0 0 8px 0; color: #666; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px;">Recommendations</h5>';
        const recList = document.createElement('ul');
        recList.style.listStyleType = 'disc';
        recList.style.paddingLeft = '20px';
        recList.style.margin = '0';
        seo.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.style.fontSize = '12px';
            li.style.color = '#666';
            li.style.marginBottom = '4px';
            li.textContent = rec;
            recList.appendChild(li);
        });
        recSection.appendChild(recList);
        resultsContainer.appendChild(recSection);
    }

    const detectedSection = document.createElement('div');
    detectedSection.style.marginTop = '16px';
    detectedSection.innerHTML = '<h5 style="margin: 0 0 8px 0; color: #666; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px;">Detected SEO Elements</h5>';

    const detectedList = document.createElement('ul');
    detectedList.style.listStyleType = 'disc';
    detectedList.style.paddingLeft = '20px';
    detectedList.style.margin = '0';

    const presentElements = [];

    if (seo.basics.title && seo.basics.title.value !== 'Missing') presentElements.push(`Title: "${seo.basics.title.value}"`);
    if (seo.basics.metaDescription && seo.basics.metaDescription.value !== 'Missing') presentElements.push(`Meta Description: "${seo.basics.metaDescription.value.substring(0, 50)}..."`);
    if (seo.basics.metaKeywords && seo.basics.metaKeywords.value !== 'Missing') presentElements.push(`Meta Keywords: "${seo.basics.metaKeywords.value}"`);

    if (seo.content.headings) {
        const hCounts = Object.entries(seo.content.headings).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(', ');
        presentElements.push(`Headings: ${hCounts}`);
    }
    if (seo.content.totalImages > 0) presentElements.push(`Images: ${seo.content.totalImages} total, ${seo.content.imagesWithoutAlt} without alt`);
    if (seo.content.totalLinks > 0) presentElements.push(`Links: ${seo.content.totalLinks} total`);

    if (seo.technical.canonicalUrl && seo.technical.canonicalUrl.value !== 'Missing') presentElements.push(`Canonical URL: ${seo.technical.canonicalUrl.value}`);
    if (seo.technical.viewport && seo.technical.viewport.value !== 'Missing') presentElements.push(`Viewport: ${seo.technical.viewport.value}`);
    if (seo.technical.lang && seo.technical.lang.value !== 'Missing') presentElements.push(`HTML Lang: ${seo.technical.lang.value}`);
    if (seo.technical.charset && seo.technical.charset.value !== 'Missing') presentElements.push(`Charset: ${seo.technical.charset.value}`);
    if (seo.technical.https && seo.technical.https.value === 'https:') presentElements.push('HTTPS: Enabled');
    if (seo.technical.schema && seo.technical.schema.value === 'Present') presentElements.push('Schema Markup: Detected (JSON-LD)');

    if (seo.social.openGraph && Object.values(seo.social.openGraph).some(v => v !== 'Missing')) {
        const ogDetails = Object.entries(seo.social.openGraph).filter(([k]) => seo.social.openGraph[k] !== 'Missing').map(([k, v]) => `${k}: ${v}`).join(', ');
        presentElements.push(`Open Graph: ${ogDetails}`);
    }
    if (seo.social.twitterCard && Object.values(seo.social.twitterCard).some(v => v !== 'Missing')) {
        const twitterDetails = Object.entries(seo.social.twitterCard).filter(([k]) => seo.social.twitterCard[k] !== 'Missing').map(([k, v]) => `${k}: ${v}`).join(', ');
        presentElements.push(`Twitter Card: ${twitterDetails}`);
    }

    if (presentElements.length > 0) {
        presentElements.forEach(el => {
            const li = document.createElement('li');
            li.style.fontSize = '12px';
            li.style.color = '#555';
            li.style.marginBottom = '2px';
            li.textContent = el;
            detectedList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.style.fontSize = '12px';
        li.style.color = '#888';
        li.textContent = 'No SEO elements detected.';
        detectedList.appendChild(li);
    }

    detectedSection.appendChild(detectedList);
    resultsContainer.appendChild(detectedSection);

    if (seo.internalLinks !== undefined) {
        const linksDiv = document.createElement('div');
        linksDiv.style.marginBottom = '8px';
        linksDiv.innerHTML = `
            <strong style="font-size: 12px; color: #333;">Internal Links:</strong>
            <span style="font-size: 12px; color: #666; margin-left: 8px;">${seo.internalLinks || 0}</span>
            <strong style="font-size: 12px; color: #333; margin-left: 12px;">External Links:</strong>
            <span style="font-size: 12px; color: #666; margin-left: 8px;">${seo.externalLinks || 0}</span>
        `;
        resultsContainer.appendChild(linksDiv);
    }
}
// End of SEO analyzer functionality
