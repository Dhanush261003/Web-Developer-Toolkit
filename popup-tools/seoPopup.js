// SEO analyzer functionality
function initSEOAnalyzer() {
    const analyzeBtn = document.getElementById('analyzeSEO');
    const copyBtn = document.getElementById('copySEOReport');
    const downloadBtn = document.getElementById('downloadSEOReport');

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
                document.getElementById('seoExportTools').style.display = 'block';
            } else {
                showStatus('SEO analysis failed: No SEO data received.');
            }
        } catch (error) {
            showStatus('SEO analysis failed. Please refresh the page.');
        }
    });

    copyBtn.addEventListener('click', () => {
        const seoResults = document.getElementById('seoResults');
        const report = generateSEOReport(seoResults);
        navigator.clipboard.writeText(report).then(() => {
            showStatus('SEO report copied to clipboard!');
        }).catch(() => {
            showStatus('Failed to copy report');
        });
    });

    downloadBtn.addEventListener('click', () => {
        const seoResults = document.getElementById('seoResults');
        const report = generateSEOReport(seoResults);
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'seo-report.txt';
        a.click();
        URL.revokeObjectURL(url);
        showStatus('SEO report downloaded!');
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
    scoreDiv.style.background = '#252526';
    scoreDiv.style.borderRadius = '4px';
    scoreDiv.style.borderLeft = `4px solid ${seo.score >= 90 ? '#28a745' : seo.score >= 70 ? '#ffc107' : '#dc3545'}`;
    scoreDiv.innerHTML = `<strong style="font-size: 14px; color: #e0e0e0;">SEO Score: ${seo.score}/100</strong>`;
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
        catDiv.innerHTML = `<h5 style="margin: 0 0 8px 0; color: #858585; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #3e3e42; padding-bottom: 4px;">${cat.name}</h5>`;

        const catData = seo[cat.key];
        if (catData && Object.keys(catData).length > 0) {
            for (const metricKey in catData) {
                const metric = catData[metricKey];
                const item = document.createElement('div');
                item.style.marginBottom = '6px';
                item.style.padding = '4px';
                item.style.borderRadius = '3px';
                item.style.background = metric.status === 'good' ? '#2d2d30' : metric.status === 'warning' ? '#352e23' : '#3a2426';

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
                    <strong style="font-size: 12px; color: #e0e0e0;">${metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>
                    <span style="font-size: 12px; color: #cfcfcf; margin-left: 8px;">${displayValue}</span>
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
    detectedSection.innerHTML = '<h5 style="margin: 0 0 8px 0; color: #858585; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #3e3e42; padding-bottom: 4px;">Detected SEO Elements</h5>';

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
            li.style.color = '#cfcfcf';
            li.style.marginBottom = '2px';
            li.textContent = el;
            detectedList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.style.fontSize = '12px';
        li.style.color = '#9a9a9a';
        li.textContent = 'No SEO elements detected.';
        detectedList.appendChild(li);
    }

    detectedSection.appendChild(detectedList);
    resultsContainer.appendChild(detectedSection);

    // Advanced SEO Features Sections
    const advancedSections = [
        {
            key: 'titleMetaValidation',
            name: 'Title & Meta Validation',
            data: seo.basics,
            items: [
                { key: 'titleLength', label: 'Title Length', value: `${seo.basics.titleLength} chars`, status: seo.basics.titleLengthStatus },
                { key: 'descLength', label: 'Meta Description Length', value: `${seo.basics.descLength} chars`, status: seo.basics.descLengthStatus },
                { key: 'duplicateTitle', label: 'Duplicate Title', value: seo.basics.duplicateTitle ? 'Yes' : 'No', status: seo.basics.duplicateTitle ? 'error' : 'good' }
            ]
        },
        {
            key: 'headingStructure',
            name: 'Heading Structure',
            data: seo.content.headingStructure,
            items: [
                { key: 'multipleH1', label: 'Multiple H1 Tags', value: seo.content.headingStructure.multipleH1 ? 'Yes' : 'No', status: seo.content.headingStructure.multipleH1 ? 'error' : 'good' },
                { key: 'skippedLevels', label: 'Skipped Levels', value: seo.content.headingStructure.skippedLevels.length > 0 ? seo.content.headingStructure.skippedLevels.join(', ') : 'None', status: seo.content.headingStructure.skippedLevels.length > 0 ? 'warning' : 'good' },
                { key: 'hierarchy', label: 'Heading Hierarchy', value: 'Tree View', status: 'info' }
            ]
        },
        {
            key: 'imageSEO',
            name: 'Image SEO',
            data: seo.content,
            items: [
                { key: 'imagesWithoutAlt', label: 'Images Missing Alt', value: `${seo.content.imagesWithoutAltList?.length || 0} images`, status: (seo.content.imagesWithoutAltList?.length || 0) > 0 ? 'warning' : 'good' },
                { key: 'oversizedImages', label: 'Oversized Images (>200KB)', value: `${seo.content.oversizedImages?.length || 0} images`, status: (seo.content.oversizedImages?.length || 0) > 0 ? 'warning' : 'good' },
                { key: 'lazyLoading', label: 'Lazy Loading', value: `${seo.content.lazyLoadingCount || 0} images`, status: (seo.content.lazyLoadingCount || 0) > 0 ? 'good' : 'warning' }
            ]
        },
        {
            key: 'linkAnalysis',
            name: 'Link Analysis',
            data: seo.content,
            items: [
                { key: 'internalLinks', label: 'Internal Links', value: `${seo.content.internalLinks || 0}`, status: 'info' },
                { key: 'externalLinks', label: 'External Links', value: `${seo.content.externalLinks || 0}`, status: 'info' },
                { key: 'brokenLinks', label: 'Broken Links', value: `${seo.content.brokenLinks?.length || 0}`, status: (seo.content.brokenLinks?.length || 0) > 0 ? 'error' : 'good' },
                { key: 'nofollowLinks', label: 'Nofollow Links', value: `${seo.content.nofollowCount || 0}`, status: 'info' },
                { key: 'genericAnchors', label: 'Generic Anchors', value: `${seo.content.genericAnchors || 0}`, status: (seo.content.genericAnchors || 0) > 0 ? 'warning' : 'good' }
            ]
        },
        {
            key: 'technicalAdvanced',
            name: 'Technical SEO Advanced',
            data: seo.technical,
            items: [
                { key: 'robotsMeta', label: 'Robots Meta', value: seo.technical.robotsMeta, status: seo.technical.robotsMeta !== 'Missing' ? 'good' : 'warning' },
                { key: 'xRobotsTag', label: 'X-Robots-Tag', value: seo.technical.xRobotsTag, status: seo.technical.xRobotsTag !== 'Missing' ? 'good' : 'warning' },
                { key: 'hreflang', label: 'Hreflang Tags', value: `${seo.technical.hreflangCount || 0}`, status: 'info' },
                { key: 'sitemap', label: 'Sitemap', value: seo.technical.sitemap !== 'Missing' ? 'Present' : 'Missing', status: seo.technical.sitemap !== 'Missing' ? 'good' : 'warning' },
                { key: 'favicon', label: 'Favicon', value: seo.technical.favicon !== 'Missing' ? 'Present' : 'Missing', status: seo.technical.favicon !== 'Missing' ? 'good' : 'warning' }
            ]
        },
        {
            key: 'coreWebVitals',
            name: 'Core Web Vitals',
            data: seo.coreWebVitals,
            items: [
                { key: 'lcp', label: 'LCP (Largest Contentful Paint)', value: seo.coreWebVitals?.lcp !== 'Unknown' ? `${Math.round(seo.coreWebVitals.lcp)}ms` : 'Unknown', status: seo.coreWebVitals?.lcpStatus || 'warning' },
                { key: 'cls', label: 'CLS (Cumulative Layout Shift)', value: seo.coreWebVitals?.cls || 'Unknown', status: 'warning' },
                { key: 'inp', label: 'INP (Interaction to Next Paint)', value: seo.coreWebVitals?.inp || 'Unknown', status: 'warning' }
            ]
        },
        {
            key: 'schemaDetails',
            name: 'Schema Details',
            data: seo.schema,
            items: [
                { key: 'schemaCount', label: 'Schema Blocks', value: `${seo.schema?.count || 0}`, status: (seo.schema?.count || 0) > 0 ? 'good' : 'warning' },
                { key: 'schemaTypes', label: 'Schema Types', value: seo.schema?.types?.join(', ') || 'None', status: (seo.schema?.types?.length || 0) > 0 ? 'good' : 'warning' },
                { key: 'schemaValid', label: 'JSON-LD Valid', value: seo.schema?.valid ? 'Yes' : 'No', status: seo.schema?.valid ? 'good' : 'error' }
            ]
        },
        {
            key: 'socialPreview',
            name: 'Social Preview',
            data: seo.social,
            items: [
                { key: 'ogImage', label: 'Open Graph Image', value: seo.social.openGraph?.imagePreview !== 'Missing' ? 'Present' : 'Missing', status: seo.social.openGraph?.imagePreview !== 'Missing' ? 'good' : 'warning' },
                { key: 'twitterImage', label: 'Twitter Card Image', value: seo.social.twitterCard?.imagePreview !== 'Missing' ? 'Present' : 'Missing', status: seo.social.twitterCard?.imagePreview !== 'Missing' ? 'good' : 'warning' }
            ]
        }
    ];

    advancedSections.forEach(section => {
        const sectionDiv = document.createElement('details');
        sectionDiv.style.marginBottom = '16px';
        sectionDiv.style.border = '1px solid #3e3e42';
        sectionDiv.style.borderRadius = '4px';
        sectionDiv.style.background = '#252526';

        const summary = document.createElement('summary');
        summary.style.padding = '8px';
        summary.style.cursor = 'pointer';
        summary.style.fontSize = '12px';
        summary.style.fontWeight = 'bold';
        summary.style.color = '#858585';
        summary.style.textTransform = 'uppercase';
        summary.style.borderBottom = '1px solid #3e3e42';
        summary.style.marginBottom = '8px';
        summary.textContent = section.name;
        sectionDiv.appendChild(summary);

        const contentDiv = document.createElement('div');
        contentDiv.style.padding = '8px';

        section.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.style.marginBottom = '6px';
            itemDiv.style.padding = '4px';
            itemDiv.style.borderRadius = '3px';
            itemDiv.style.background = item.status === 'good' ? '#2d2d30' : item.status === 'warning' ? '#352e23' : item.status === 'error' ? '#3a2426' : '#252526';

            const icon = item.status === 'good' ? '✅' : item.status === 'warning' ? '⚠️' : item.status === 'error' ? '❌' : 'ℹ️';
            const statusColor = item.status === 'good' ? '#28a745' : item.status === 'warning' ? '#ffc107' : item.status === 'error' ? '#dc3545' : '#17a2b8';

            itemDiv.innerHTML = `
                <span style="color: ${statusColor}; font-size: 12px; margin-right: 6px;">${icon}</span>
                <strong style="font-size: 12px; color: #e0e0e0;">${item.label}:</strong>
                <span style="font-size: 12px; color: #cfcfcf; margin-left: 8px;">${item.value}</span>
            `;

            // Special handling for heading hierarchy
            if (item.key === 'hierarchy' && section.data.hierarchy) {
                const treeDiv = document.createElement('div');
                treeDiv.style.marginTop = '8px';
                treeDiv.style.fontSize = '11px';
                treeDiv.style.color = '#cfcfcf';
                section.data.hierarchy.forEach(h => {
                    const indent = '  '.repeat(h.level - 1);
                    treeDiv.innerHTML += `${indent}H${h.level}: ${h.text}<br>`;
                });
                itemDiv.appendChild(treeDiv);
            }

            contentDiv.appendChild(itemDiv);
        });

        sectionDiv.appendChild(contentDiv);
        resultsContainer.appendChild(sectionDiv);
    });

    // Export Tools
    const exportDiv = document.createElement('div');
    exportDiv.style.marginTop = '16px';
    exportDiv.style.display = 'flex';
    exportDiv.style.gap = '8px';

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Copy & Download SEO Report';
    exportBtn.style.padding = '6px 12px';
    exportBtn.style.background = '#007bff';
    exportBtn.style.color = 'white';
    exportBtn.style.border = 'none';
    exportBtn.style.borderRadius = '3px';
    exportBtn.style.cursor = 'pointer';
    exportBtn.style.fontSize = '12px';
    exportBtn.onclick = () => {
        const report = generateSEOReport(seo);
        navigator.clipboard.writeText(report).then(() => {
            // Download the JSON report
            const blob = new Blob([JSON.stringify(seo, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'seo-report.json';
            a.click();
            URL.revokeObjectURL(url);
            showStatus('SEO report copied to clipboard and downloaded!');
        }).catch(() => {
            showStatus('Failed to copy report');
        });
    };

    exportDiv.appendChild(exportBtn);
    resultsContainer.appendChild(exportDiv);

    if (seo.internalLinks !== undefined) {
        const linksDiv = document.createElement('div');
        linksDiv.style.marginBottom = '8px';
        linksDiv.innerHTML = `
            <strong style="font-size: 12px; color: #e0e0e0;">Internal Links:</strong>
            <span style="font-size: 12px; color: #cfcfcf; margin-left: 8px;">${seo.internalLinks || 0}</span>
            <strong style="font-size: 12px; color: #e0e0e0; margin-left: 12px;">External Links:</strong>
            <span style="font-size: 12px; color: #cfcfcf; margin-left: 8px;">${seo.externalLinks || 0}</span>
        `;
        resultsContainer.appendChild(linksDiv);
    }
}

function generateSEOReport(seo) {
    let report = `SEO Analysis Report\n`;
    report += `==================\n\n`;
    report += `SEO Score: ${seo.score}/100\n\n`;

    const categories = [
        { key: 'basics', name: 'Basic SEO' },
        { key: 'content', name: 'Content SEO' },
        { key: 'technical', name: 'Technical SEO' },
        { key: 'social', name: 'Social SEO' }
    ];

    categories.forEach(cat => {
        report += `${cat.name}:\n`;
        const catData = seo[cat.key];
        if (catData && Object.keys(catData).length > 0) {
            for (const metricKey in catData) {
                const metric = catData[metricKey];
                let displayValue = metric.value;
                if (metricKey === 'headings' && typeof metric.value === 'object') {
                    displayValue = `H1: ${metric.value.h1}, H2: ${metric.value.h2}, H3: ${metric.value.h3}, H4+: ${metric.value.h4 + metric.value.h5 + metric.value.h6}`;
                } else if (metricKey === 'openGraph' || metricKey === 'twitterCard') {
                    displayValue = Object.entries(metric.value).map(([k, v]) => `${k}: ${v}`).join(', ');
                } else if (metricKey === 'pageLoadTime') {
                    displayValue = `${metric.value} (${metric.message})`;
                }
                report += `  - ${metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${displayValue}\n`;
            }
        }
        report += '\n';
    });

    if (seo.recommendations && seo.recommendations.length > 0) {
        report += `Recommendations:\n`;
        seo.recommendations.forEach(rec => {
            report += `  - ${rec}\n`;
        });
        report += '\n';
    }

    // Add advanced features to report
    const advancedSections = [
        'Title & Meta Validation',
        'Heading Structure',
        'Image SEO',
        'Link Analysis',
        'Technical SEO Advanced',
        'Core Web Vitals',
        'Schema Details',
        'Social Preview'
    ];

    advancedSections.forEach(section => {
        report += `${section}:\n`;
        // Note: Detailed advanced data would need to be passed or stored
        report += `  - See detailed analysis in the extension popup\n`;
    });

    return report;
}
// End of SEO analyzer functionality
