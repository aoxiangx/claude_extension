class ContentFilter {
    constructor() {
        this.settings = {
            filterWords: '',
            highlightColor: '#ffeb3b',
            filterMode: 'highlight'
        };
        this.processedNodes = new WeakSet();
        this.observer = null;
        this.processing = false;
    }

    // Initialize observer for dynamic content
    initObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            if (!this.processing) {
                this.processPage();
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Create regex pattern from keywords
    createSearchPattern() {
        if (!this.settings.filterWords) return null;
        
        const words = this.settings.filterWords
            .split(',')
            .map(word => word.trim())
            .filter(word => word.length > 0)
            .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        
        return words.length > 0 ? new RegExp(`(${words.join('|')})`, 'gi') : null;
    }

    // Process a single text node
    processTextNode(textNode, pattern) {
        if (this.processedNodes.has(textNode)) return 0;
        
        const text = textNode.textContent;
        const matches = text.match(pattern);
        if (!matches) return 0;

        const span = document.createElement('span');
        if (this.settings.filterMode === 'highlight') {
            // Highlight matches
            span.innerHTML = text.replace(pattern, 
                `<span class="extension-highlight" style="background-color: ${this.settings.highlightColor}">$1</span>`
            );
        } else {
            // Hide matches
            span.innerHTML = text.replace(pattern, 
                `<span class="extension-hidden" style="display: none">$1</span>`
            );
        }

        textNode.parentNode.replaceChild(span, textNode);
        this.processedNodes.add(span);
        return matches.length;
    }

    // Remove existing highlights and hidden elements
    cleanExistingMarkup() {
        const elements = document.querySelectorAll('.extension-highlight, .extension-hidden');
        elements.forEach(element => {
            if (element.classList.contains('extension-highlight') || 
                element.classList.contains('extension-hidden')) {
                const parent = element.parentNode;
                const text = document.createTextNode(element.textContent);
                parent.replaceChild(text, element);
            }
        });
    }

    // Main processing function
    processPage() {
        if (this.processing) return { matchCount: 0, processTime: 0 };
        
        this.processing = true;
        const startTime = performance.now();
        let matchCount = 0;

        try {
            // Clean existing markup
            this.cleanExistingMarkup();

            // Create search pattern
            const pattern = this.createSearchPattern();
            if (!pattern) {
                this.processing = false;
                return { matchCount: 0, processTime: 0 };
            }

            // Process text nodes
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                        
                        const parent = node.parentNode;
                        const isScript = parent.tagName === 'SCRIPT';
                        const isStyle = parent.tagName === 'STYLE';
                        const isTextArea = parent.tagName === 'TEXTAREA';
                        const isInput = parent.tagName === 'INPUT';
                        const isProcessed = this.processedNodes.has(node);
                        
                        if (isScript || isStyle || isTextArea || isInput || isProcessed) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );

            let node;
            while (node = walker.nextNode()) {
                matchCount += this.processTextNode(node, pattern);
            }

        } catch (error) {
            console.error('Error processing page:', error);
        }

        this.processing = false;
        return {
            matchCount,
            processTime: Math.round(performance.now() - startTime)
        };
    }

    // Update settings and reprocess page
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.processedNodes = new WeakSet();
        return this.processPage();
    }
}

// Initialize content filter
const contentFilter = new ContentFilter();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateSettings') {
        const stats = contentFilter.updateSettings({
            filterWords: request.filterWords,
            highlightColor: request.highlightColor,
            filterMode: request.filterMode
        });
        sendResponse(stats);
    }
    return true;
});

// Load saved settings and initialize
chrome.storage.sync.get(
    ['filterWords', 'highlightColor', 'filterMode'],
    function(data) {
        contentFilter.updateSettings({
            filterWords: data.filterWords || '',
            highlightColor: data.highlightColor || '#ffeb3b',
            filterMode: data.filterMode || 'highlight'
        });
        contentFilter.initObserver();
    }
);