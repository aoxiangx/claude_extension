document.addEventListener('DOMContentLoaded', function() {
    const DEFAULT_COLORS = [
        { color: '#ffeb3b', name: 'Yellow' },
        { color: '#4caf50', name: 'Green' },
        { color: '#f44336', name: 'Red' },
        { color: '#2196f3', name: 'Blue' },
        { color: '#ff9800', name: 'Orange' },
        { color: '#e91e63', name: 'Pink' },
        { color: '#9c27b0', name: 'Purple' },
        { color: '#00bcd4', name: 'Cyan' }
    ];

    class PopupManager {
        constructor() {
            this.elements = {
                keywordsInput: document.getElementById('keywordsInput'),
                colorPalette: document.getElementById('colorPalette'),
                highlightToggle: document.getElementById('highlightToggle'),
                filterToggle: document.getElementById('filterToggle'),
                filterOptions: document.getElementById('filterOptions'),
                caseSensitiveToggle: document.getElementById('caseSensitiveToggle'),
                autoUpdateToggle: document.getElementById('autoUpdateToggle'),
                applyButton: document.getElementById('applyButton'),
                clearButton: document.getElementById('clearButton'),
                statusMessage: document.getElementById('statusMessage')
            };

            this.settings = {
                keywords: '',
                selectedColor: DEFAULT_COLORS[0].color,
                highlightEnabled: false,
                filterEnabled: false,
                filterMode: 'hide',
                caseSensitive: false,
                autoUpdate: false
            };

            this.initialize();
        }

        async initialize() {
            this.initializeColorPalette();
            this.setupEventListeners();
            await this.loadSettings();
            this.updateUI();
        }

        initializeColorPalette() {
            DEFAULT_COLORS.forEach(({color, name}) => {
                const colorOption = document.createElement('div');
                colorOption.className = 'wcm-color-option';
                colorOption.style.backgroundColor = color;
                colorOption.title = name;
                colorOption.dataset.color = color;
                
                if (color === this.settings.selectedColor) {
                    colorOption.classList.add('selected');
                }

                colorOption.addEventListener('click', () => this.selectColor(color));
                this.elements.colorPalette.appendChild(colorOption);
            });
        }

        setupEventListeners() {
            // Toggle handlers
            this.elements.highlightToggle.addEventListener('change', () => {
                this.settings.highlightEnabled = this.elements.highlightToggle.checked;
                if (this.settings.autoUpdate) this.applySettings();
            });

            this.elements.filterToggle.addEventListener('change', () => {
                this.settings.filterEnabled = this.elements.filterToggle.checked;
                this.elements.filterOptions.style.display = 
                    this.settings.filterEnabled ? 'block' : 'none';
                if (this.settings.autoUpdate) this.applySettings();
            });

            // Filter mode handlers
            document.querySelectorAll('input[name="filterMode"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.settings.filterMode = e.target.value;
                    if (this.settings.autoUpdate) this.applySettings();
                });
            });

            // Other option handlers
            this.elements.caseSensitiveToggle.addEventListener('change', () => {
                this.settings.caseSensitive = this.elements.caseSensitiveToggle.checked;
                if (this.settings.autoUpdate) this.applySettings();
            });

            this.elements.autoUpdateToggle.addEventListener('change', () => {
                this.settings.autoUpdate = this.elements.autoUpdateToggle.checked;
            });

            // Keywords input handler with debounce
            let debounceTimeout;
            this.elements.keywordsInput.addEventListener('input', () => {
                this.settings.keywords = this.elements.keywordsInput.value;
                if (this.settings.autoUpdate) {
                    clearTimeout(debounceTimeout);
                    debounceTimeout = setTimeout(() => this.applySettings(), 500);
                }
            });

            // Button handlers
            this.elements.applyButton.addEventListener('click', () => this.applySettings());
            this.elements.clearButton.addEventListener('click', () => this.clearAll());
        }

        selectColor(color) {
            this.settings.selectedColor = color;
            document.querySelectorAll('.wcm-color-option').forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.color === color);
            });
            if (this.settings.autoUpdate) this.applySettings();
        }

        async loadSettings() {
            try {
                const data = await new Promise(resolve => {
                    chrome.storage.sync.get('wcmSettings', resolve);
                });
                
                if (data.wcmSettings) {
                    this.settings = { ...this.settings, ...data.wcmSettings };
                }
            } catch (error) {
                this.showStatus('Error loading settings', true);
            }
        }

        updateUI() {
            this.elements.keywordsInput.value = this.settings.keywords;
            this.elements.highlightToggle.checked = this.settings.highlightEnabled;
            this.elements.filterToggle.checked = this.settings.filterEnabled;
            this.elements.caseSensitiveToggle.checked = this.settings.caseSensitive;
            this.elements.autoUpdateToggle.checked = this.settings.autoUpdate;
            
            document.querySelector(`input[value="${this.settings.filterMode}"]`).checked = true;
            this.elements.filterOptions.style.display = 
                this.settings.filterEnabled ? 'block' : 'none';

            document.querySelectorAll('.wcm-color-option').forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.color === this.settings.selectedColor);
            });
        }

        async applySettings() {
            try {
                // Save settings
                await new Promise(resolve => {
                    chrome.storage.sync.set({ wcmSettings: this.settings }, resolve);
                });

                // Apply to current tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'updateSettings',
                    settings: this.settings
                });

                this.showStatus('Settings applied successfully');
            } catch (error) {
                this.showStatus('Error applying settings', true);
            }
        }

        async clearAll() {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.tabs.sendMessage(tab.id, { action: 'clearAll' });
                this.showStatus('All highlights and filters cleared');
            } catch (error) {
                this.showStatus('Error clearing content', true);
            }
        }

        showStatus(message, isError = false) {
            this.elements.statusMessage.textContent = message;
            this.elements.statusMessage.className = 
                `wcm-status ${isError ? 'error' : 'success'}`;

            setTimeout(() => {
                this.elements.statusMessage.className = 'wcm-status';
            }, 3000);
        }
    }

    // Initialize popup
    const popup = new PopupManager();
});