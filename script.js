let translationData = {
    stringresources: {
        strings: {
            string: []
        }
    }
};

// Supported languages based on your JSON structure
const supportedLanguages = {
    'en': 'English',
    'de': 'German',
    'es': 'Spanish',
    'fr': 'French',
    'it': 'Italian',
    'br': 'Portuguese (Brazil)',
    'ru': 'Russian'
};

// CSV column mapping - exact order from your template
const csvColumnMap = {
    'EN': 'en',
    'DE': 'de',
    'ES': 'es',
    'FR': 'fr',
    'IT': 'it',
    'BR PT': 'br',
    'RU': 'ru'
};

// Language order for CSV export
const csvLanguageOrder = ['en', 'de', 'es', 'fr', 'it', 'br', 'ru'];

// File input handlers
document.getElementById('csvFile').addEventListener('change', handleCSVImport);
document.getElementById('jsonFile').addEventListener('change', handleJSONImport);

async function handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        await parseCSVData(text);
        showNotification(`Successfully imported ${file.name}`, 'success');
        updateInterface();
    } catch (error) {
        showNotification(`Error importing CSV: ${error.message}`, 'error');
    }
}

async function handleJSONImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        if (jsonData.stringresources && jsonData.stringresources.strings && jsonData.stringresources.strings.string) {
            translationData = jsonData;
        } else {
            throw new Error('Invalid JSON structure. Expected game translation format.');
        }

        showNotification(`Successfully imported ${file.name}`, 'success');
        updateInterface();
    } catch (error) {
        showNotification(`Error importing JSON: ${error.message}`, 'error');
    }
}

function parseCSVData(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);
    const contextIndex = headers.findIndex(h => h.includes('CONTEXT'));

    if (contextIndex === -1) {
        throw new Error('CSV must have a CONTEXT column');
    }

    // Find language columns
    const languageColumns = {};
    headers.forEach((header, index) => {
        const cleanHeader = header.trim();
        if (csvColumnMap[cleanHeader]) {
            languageColumns[csvColumnMap[cleanHeader]] = index;
        }
    });

    if (Object.keys(languageColumns).length === 0) {
        throw new Error('No supported language columns found');
    }

    // Parse data rows
    const strings = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length <= contextIndex) continue;

        // Use row index as ID if CONTEXT is empty/null
        let id = row[contextIndex]?.trim();
        if (!id || id === 'null' || id === '') {
            id = `translation_${i}`; // Generate unique ID for empty rows
        }

        const stringObj = { id };

        // Add translations for each language
        Object.entries(languageColumns).forEach(([lang, colIndex]) => {
            if (row[colIndex]) {
                stringObj[lang] = row[colIndex].trim();
            }
        });

        strings.push(stringObj);
    }

    translationData.stringresources.strings.string = strings;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

function updateInterface() {
    updateStats();
    updateLanguageList();
    updatePreview();
    updateExportOutput();
}

function updateStats() {
    const strings = translationData.stringresources.strings.string || [];
    const languages = new Set();
    let totalTranslations = 0;
    let missingTranslations = 0;

    strings.forEach(str => {
        Object.keys(supportedLanguages).forEach(lang => {
            if (str[lang]) {
                languages.add(lang);
                totalTranslations++;
            } else {
                missingTranslations++;
            }
        });
    });

    document.getElementById('totalKeys').textContent = strings.length;
    document.getElementById('totalLanguages').textContent = languages.size;
    document.getElementById('totalTranslations').textContent = totalTranslations;
    document.getElementById('missingTranslations').textContent = missingTranslations;
}

function updateLanguageList() {
    const strings = translationData.stringresources.strings.string || [];
    const languages = new Set();

    strings.forEach(str => {
        Object.keys(supportedLanguages).forEach(lang => {
            if (str[lang]) languages.add(lang);
        });
    });

    const container = document.getElementById('languageList');
    container.innerHTML = '';

    // Use csvLanguageOrder instead of sorting alphabetically
    csvLanguageOrder.filter(lang => languages.has(lang)).forEach(lang => {
        const tag = document.createElement('div');
        tag.className = 'language-tag';
        tag.textContent = `${lang.toUpperCase()} - ${supportedLanguages[lang]}`;
        container.appendChild(tag);
    });
}

function updatePreview() {
    const strings = translationData.stringresources.strings.string || [];
    const container = document.getElementById('previewContainer');

    if (strings.length === 0) {
        container.innerHTML = '<p>No translations loaded.</p>';
        return;
    }

    // Get available languages in correct order
    const availableLanguages = new Set();
    strings.forEach(str => {
        Object.keys(supportedLanguages).forEach(lang => {
            if (str[lang]) availableLanguages.add(lang);
        });
    });

    // Filter csvLanguageOrder to only include available languages
    const languages = csvLanguageOrder.filter(lang => availableLanguages.has(lang));

    let html = '<table class="preview-table"><thead><tr>';
    html += '<th>Key</th>';
    languages.forEach(lang => {
        html += `<th>${lang.toUpperCase()}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Show all translations
    strings.forEach(str => {
        html += '<tr>';
        html += `<td title="${str.id}">${str.id}</td>`;
        languages.forEach(lang => {
            const translation = str[lang] || '';
            html += `<td title="${translation}">${translation}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';

    container.innerHTML = html;
}

function updateExportOutput() {
    if (translationData.stringresources.strings.string.length > 0) {
        document.getElementById('exportOutput').value = JSON.stringify(translationData, null, 2);
    }
}

function exportGameJSON() {
    if (translationData.stringresources.strings.string.length === 0) {
        showNotification('No translation data to export', 'warning');
        return;
    }

    const jsonStr = JSON.stringify(translationData, null, 2);
    downloadFile('translations.json', jsonStr, 'application/json');
    showNotification('Game JSON exported successfully!', 'success');
}

function exportCSV() {
    const strings = translationData.stringresources.strings.string || [];
    if (strings.length === 0) {
        showNotification('No translation data to export', 'warning');
        return;
    }

    // Create CSV header in exact order
    let csv = 'CONTEXT – PLEASE, LOOK HERE FOR SPECIFICATIONS,EN,DE,ES,FR,IT,BR PT,RU\n';

    // Add data rows in exact language order
    strings.forEach(str => {
        csv += `"${str.id}"`;
        csvLanguageOrder.forEach(lang => {
            const translation = (str[lang] || '').replace(/"/g, '""');
            csv += `,"${translation}"`;
        });
        csv += '\n';
    });

    downloadFile('translations.csv', csv, 'text/csv');
    showNotification('CSV exported successfully!', 'success');
}

async function copyToClipboard() {
    const output = document.getElementById('exportOutput').value;
    if (!output) {
        showNotification('No data to copy', 'warning');
        return;
    }

    try {
        await navigator.clipboard.writeText(output);
        showNotification('JSON copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.getElementById('exportOutput');
        textarea.select();
        document.execCommand('copy');
        showNotification('JSON copied to clipboard!', 'success');
    }
}

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearData() {
    translationData = {
        stringresources: {
            strings: {
                string: []
            }
        }
    };

    document.getElementById('csvFile').value = '';
    document.getElementById('jsonFile').value = '';
    document.getElementById('exportOutput').value = '';

    updateInterface();
    showNotification('All data cleared', 'success');
}

function showNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto hide after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Initialize interface
updateInterface();