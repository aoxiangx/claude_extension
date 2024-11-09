class TextHighlighter {
    constructor() {
        this.settings = {
            currentColor: '#ffeb3b',
            isHighlightMode: false
        };
        this.highlights = new Map(); // Store highlights with unique IDs
        this.isSelecting = false;
        this.setupEventListeners();
        this.loadHighlights();
    }

    // Generate unique ID for highlights
    generateHighlightId() {
        return 'highlight-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Set up event listeners
    setupEventListeners() {
        document.addEventListener('mouseup', this.handleSelection.bind(this));
        document.addEventListener('mousedown', () => {
            this.isSelecting = true;
        });
    }

    // Handle text selection
    handleSelection() {
        if (!this.settings.isHighlightMode || !this.isSelecting) return;
        this.isSelecting = false;

        const selection = window.getSelection();
        if (selection.isCollapsed) return;

        const range = selection.getRangeAt(0);
        if (this.isWithinHighlight(range)) {
            // Handle overlapping highlights
            this.handleOverlappingHighlight(range);
        } else {
            this.createHighlight(range);
        }
        selection.removeAllRanges();
    }

    // Check if selection is within existing highlight
    isWithinHighlight(range) {
        let node = range.commonAncestorContainer;
        while (node && node !== document.body) {
            if (node.classList && node.classList.contains('text-highlight')) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }

    // Handle overlapping highlights
    handleOverlappingHighlight(range) {
        const existingHighlight = this.findExistingHighlight(range);
        if (existingHighlight) {
            // Split existing highlight if necessary
            this.splitHighlight(existingHighlight, range);
        }
    }

    // Find existing highlight element
    findExistingHighlight(range) {
        let node = range.commonAncestorContainer;
        while (node && node !== document.body) {
            if (node.classList && node.classList.contains('text-highlight')) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    // Split existing highlight
    splitHighlight(highlight, range) {
        const highlightId = this.generateHighlightId();
        const span = document.createElement('span');
        span.className = 'text-highlight';
        span.style.backgroundColor = this.settings.currentColor;
        span.dataset.highlightId = highlightId;

        // Create tooltip
        const tooltip = document.createElement('span');
        tooltip.className = 'highlight-tooltip';
        tooltip.textContent = 'Click to remove';
        span.appendChild(tooltip);

        // Store highlight data
        this.highlights.set(highlightId, {
            color: this.settings.currentColor,
            text: range.toString(),
            timestamp: Date.now()
        });

        try {
            range.surroundContents(span);
            this.saveHighlights();
        } catch (e) {
            console.error('Error creating highlight:', e);
        }
    }

    // Create new highlight
    createHighlight(range) {
        const highlightId = this.generateHighlightId();
        const span = document.createElement('span');
        span.className = 'text-highlight';
        span.style.backgroundColor = this.settings.currentColor;
        span.dataset.highlightId = highlightId;

        // Create tooltip
        const tooltip = document.createElement('span');
        tooltip.className = 'highlight-tooltip';
        tooltip.textContent = 'Click to remove';
        span.appendChild(tooltip);

        // Store highlight data
        this.highlights.set(highlightId, {
            color: this.settings.currentColor,
            text: range.toString(),
            timestamp: Date.now()
        });

        try {
            range.surroundContents(span);
            this.saveHighlights();

            // Add click handler for removal
            span.addEventListener('click', (e) => {
                if (e.target === span) {
                    this.removeHighlight(highlightId);
                }
            });
        } catch (e) {
            console.error('Error creating highlight:', e);
        }
    }

    // Remove specific highlight
    removeHighlight(highlightId) {
        const element = document.querySelector(`[data-highlight-id="${highlightId}"]`);
        if (element) {
            const parent = element.parentNode;
            const textContent = element.textContent;
            parent.replaceChild(document.createTextNode(textContent), element);
            this.highlights.delete(highlightId);
            this.saveHighlights();
        }
    }

    // Remove all highlights
    removeAllHighlights() {
        document.querySelectorAll('.text-highlight').forEach(element => {
            const parent = element.parentNode;
            const textContent = element.textContent;
            parent.replaceChild(document.createTextNode(textContent), element);
        });
        this.highlights.clear();
        this.saveHighlights();
    }

    // Save highlights to storage
    saveHighlights() {
        const highlightData = Array.from(this.highlights.entries()).map(([id, data]) => ({
            id,
            ...data
        }));

        chrome.storage.sync.set({ highlights: highlightData });
    }

    // Load highlights from storage
    loadHighlights() {
        chrome.storage.sync.get('highlights', (data) => {
            if (data.highlights) {
                // Clear existing highlights
                this.removeAllHighlights();

                // Rebuild highlights map
                this.highlights.clear();
                data.highlights.forEach(highlight => {
                    this.highlights.set(highlight.id, {
                        color: highlight.color,
                        text: highlight.text,
                        timestamp: highlight.timestamp
                    });
                });

                // Reapply highlights
                this.reapplyHighlights();
            }
        });
    }

    // Reapply highlights after page load
    reapplyHighlights() {
        const textNodes = document.evaluate(
            '//text()',
            document.body,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < textNodes.snapshotLength; i++) {
            const textNode = textNodes.snapshotItem(i);
            this.highlights.forEach((data, id) => {
                if (textNode.textContent.includes(data.text)) {
                    const range = document.createRange();
                    range.selectNodeContents(textNode);
                    const span = document.createElement('span');
                    span.className = 'text-highlight';
                    span.style.backgroundColor = data.color;
                    span.dataset.highlightId = id;
                    range.surroundContents(span);
                }
            });
        }
    }

    // Update settings
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
}

// Initialize highlighter
const highlighter = new TextHighlighter();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'updateHighlightSettings':
            highlighter.updateSettings(request.settings);
            break;
        case 'removeAllHighlights':
            highlighter.removeAllHighlights();
            break;
    }
});