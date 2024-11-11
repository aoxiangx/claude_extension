document.addEventListener('DOMContentLoaded', function() {
    // Color palette configuration
    const colors = [
        { color: '#ffeb3b', name: 'Yellow' },
        { color: '#4caf50', name: 'Green' },
        { color: '#f44336', name: 'Red' },
        { color: '#2196f3', name: 'Blue' },
        { color: '#ff9800', name: 'Orange' },
        { color: '#e91e63', name: 'Pink' },
        { color: '#9c27b0', name: 'Purple' },
        { color: '#00bcd4', name: 'Cyan' }
    ];

    // Cache DOM elements
    const elements = {
        keywords: document.getElementById('keywords'),
        colorPalette: document.getElementById('colorPalette'),
        highlightMode: document.getElementById('highlightMode'),
        caseSensitive: document.getElementById('caseSensitive'),
        autoHighlight: document.getElementById('autoHighlight'),
        applyBtn: document.getElementById('applyBtn'),
        clearBtn: document.getElementById('clearBtn'),
        status: document.getElementById('status')
    };

    let currentSettings = {
        keywords: '',
        selectedColor: colors[0].color,
        highlightMode: false,
        caseSensitive: false,
        autoHighlight: false
    };

    // Initialize color palette
    function initializeColorPalette() {
        colors.forEach(({color, name}) => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.style.backgroundColor = color;
            colorOption.title = name;
            colorOption.dataset.color = color;
            
            if (color === currentSettings.selectedColor) {
                colorOption.classList.add('selected');
            }

            colorOption.addEventListener('click', () => selectColor(color, colorOption));
            elements.colorPalette.appendChild(colorOption);
        });
    }

    // Color selection handler
    function selectColor(color, element) {
        document.querySelectorAll('.color-option').forEach(opt => 
            opt.classList.remove('selected'));
        element.classList.add('selected');
        currentSettings.selectedColor = color;
    }

    // Show status message
    function showStatus(message, isError = false) {
        elements.status.textContent = message;
        elements.status.className = `status ${isError ? 'error' : 'success'}`;
        elements.status.style.display = 'block';
        setTimeout(() => {
            elements.status.style.display = 'none';
        }, 3000);
    }

    // Save settings
    function saveSettings() {
        const settings = {
            keywords: elements.keywords.value,
            selectedColor: currentSettings.selectedColor,
            highlightMode: elements.highlightMode.checked,
            caseSensitive: elements.caseSensitive.checked,
            autoHighlight: elements.autoHighlight.checked
        };

        chrome.storage.sync.set({ highlightSettings: settings }, () => {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings', true);
                return;
            }

            // Send settings to content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateSettings',
                    settings: settings
                }, () => {
                    showStatus('Settings applied successfully');
                });
            });
        });
    }

    // Load saved settings
    function loadSettings() {
        chrome.storage.sync.get('highlightSettings', (data) => {
            if (data.highlightSettings) {
                currentSettings = data.highlightSettings;
                
                // Update UI with saved settings
                elements.keywords.value = currentSettings.keywords;
                elements.highlightMode.checked = currentSettings.highlightMode;
                elements.caseSensitive.checked = currentSettings.caseSensitive;
                elements.autoHighlight.checked = currentSettings.autoHighlight;

                // Update color palette
                document.querySelectorAll('.color-option').forEach(opt => {
                    if (opt.dataset.color === currentSettings.selectedColor) {
                        opt.classList.add('selected');
                    }
                });
            }
        });
    }

    // Event listeners
    elements.applyBtn.addEventListener('click', saveSettings);
    
    elements.clearBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'clearHighlights' }, () => {
                showStatus('All highlights cleared');
            });
        });
    });

    // Initialize
    initializeColorPalette();
    loadSettings();

    // Input debouncing for auto-highlight
    let debounceTimeout;
    elements.keywords.addEventListener('input', () => {
        if (elements.autoHighlight.checked) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(saveSettings, 500);
        }
    });
});