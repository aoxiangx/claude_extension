document.addEventListener('DOMContentLoaded', function() {
    // Predefined highlight colors with metadata
    const highlightColors = [
        { color: '#ffeb3b', name: 'Yellow' },
        { color: '#4caf50', name: 'Green' },
        { color: '#f44336', name: 'Red' },
        { color: '#2196f3', name: 'Blue' },
        { color: '#ff9800', name: 'Orange' },
        { color: '#e91e63', name: 'Pink' },
        { color: '#9c27b0', name: 'Purple' },
        { color: '#00bcd4', name: 'Cyan' }
    ];

    let currentColor = highlightColors[0].color;
    let isHighlightMode = false;

    // Initialize color palette
    function initializeColorPalette() {
        const palette = document.getElementById('colorPalette');
        highlightColors.forEach(({color, name}) => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.style.backgroundColor = color;
            colorOption.title = name;
            colorOption.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(opt => 
                    opt.classList.remove('selected'));
                colorOption.classList.add('selected');
                currentColor = color;
                updateHighlightSettings();
            });
            palette.appendChild(colorOption);
        });
        // Select first color by default
        palette.firstChild.classList.add('selected');
    }

    // Update highlight settings in storage
    function updateHighlightSettings() {
        chrome.storage.sync.set({
            highlightSettings: {
                currentColor,
                isHighlightMode
            }
        });

        // Send settings to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateHighlightSettings',
                settings: { currentColor, isHighlightMode }
            });
        });
    }

    // Toggle highlight mode
    const toggleBtn = document.getElementById('toggleHighlightMode');
    toggleBtn.addEventListener('click', function() {
        isHighlightMode = !isHighlightMode;
        toggleBtn.textContent = `Start Highlighting (${isHighlightMode ? 'On' : 'Off'})`;
        updateHighlightSettings();
    });

    // Remove all highlights
    document.getElementById('removeAllBtn').addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'removeAllHighlights' });
        });
    });

    // Load saved settings
    chrome.storage.sync.get('highlightSettings', function(data) {
        if (data.highlightSettings) {
            currentColor = data.highlightSettings.currentColor;
            isHighlightMode = data.highlightSettings.isHighlightMode;
            toggleBtn.textContent = `Start Highlighting (${isHighlightMode ? 'On' : 'Off'})`;
        }
    });

    initializeColorPalette();
});