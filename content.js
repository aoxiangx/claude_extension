class ContentManager {
    constructor() {
        this.settings = {
            keywords: '',
            selectedColor: '#ffeb3b',
            highlightEnabled: false,
            filterEnabled: false,
            filterMode: 'hide',
            caseSensitive: false,
            autoUpdate: false
        };

        this.highlights = new Map();
        this.processedNodes = new WeakSet();
        this.observer = null;
        this.processingTimeout = null;
        
        this.initialize();
    }

    async initialize() {
        try {
            // Load saved settings
            await this.loadSettings();
            
            // Initialize observer for dynamic content
            this.initializeObserver();
            
            // Process existing content if needed
            if (this.settings.highlightEnabled || this.settings.filterEnabled) {
                this.processContent(document.body);
            }
            
            // Setup message listener
            this.setupMessageListener();
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    async loadSettings() {
        const data = await new Promise(resolve => {
            chrome.storage.sync.get('wcmSettings', resolve);
        });
        
        if (data.wcmSettings) {
            this.settings = { ...this.settings, ...data.wcmSettings };
        }
    }

    initializeObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver(mutations => {
            if (this.settings.highlightEnabled || this.settings.filterEnabled) {
                this.handleMutations(mutations);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    handleMutations(mutations) {
        // Debounce processing
        clearTimeout(this.processingTimeout);
        this.processingTimeout = setTimeout(() => {
            const addedNodes = new Set();
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            addedNodes.add(node);
                        }
                    });
                } else if (mutation.type === 'characterData') {
                    const node = mutation.target.parentNode;
                    if (node && !this.isHighlightNode(node)) {
                        addedNodes.add(node);
                    }
                }
            });

            addedNodes.forEach(node => {
                this.processContent(node);
            });
        }, 100);
    }

    processContent(root) {
        // Skip if neither highlighting nor filtering is enabled
        if (!this.settings.highlightEnabled && !this.settings.filterEnabled) {
            return;
        }

        // Create text walker
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip empty nodes
                    if (!node.textContent.trim()) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // Skip special elements
                    const parent = node.parentNode;
                    if (this.shouldSkipNode(parent)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodesToProcess = [];
        let node;
        while (node = walker.nextNode()) {
            nodesToProcess.push(node);
        }

        // Process nodes in chunks to avoid blocking
        this.processNodesInChunks(nodesToProcess);
    }

    processNodesInChunks(nodes, chunkSize = 50) {
        let index = 0;

        const processChunk = () => {
            const chunk = nodes.slice(index, index + chunkSize);
            if (chunk.length === 0) return;

            chunk.forEach(node => {
                if (!this.processedNodes.has(node)) {
                    this.processNode(node);
                    this.processedNodes.add(node);
                }
            });

            index += chunkSize;
            if (index < nodes.length) {
                requestAnimationFrame(processChunk);
            }
        };

        requestAnimationFrame(processChunk);
    }

    processNode(node) {
        const text = node.textContent;
        const keywords = this.settings.keywords.split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        if (keywords.length === 0) return;

        // Create pattern for matching
        const pattern = this.createSearchPattern(keywords);
        if (!pattern) return;

        // Find matches
        const matches = this.findMatches(text, pattern);
        if (!matches || matches.length === 0) return;

        // Process based on mode
        if (this.settings.highlightEnabled) {
            this.highlightNode(node, matches);
        } else if (this.settings.filterEnabled) {
            this.filterNode(node);
        }
    }

    createSearchPattern(keywords) {
        try {
            const escapedWords = keywords.map(word => 
                word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            );
            const flags = this.settings.caseSensitive ? 'g' : 'gi';
            return new RegExp(`(${escapedWords.join('|')})`, flags);
        } catch (error) {
            console.error('Error creating search pattern:', error);
            return null;
        }
    }

    findMatches(text, pattern) {
        try {
            return text.match(pattern);
        } catch (error) {
            console.error('Error finding matches:', error);
            return null;
        }
    }

    highlightNode(node, matches) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        const text = node.textContent;

        matches.forEach(match => {
            const matchIndex = text.indexOf(match, lastIndex);
            if (matchIndex === -1) return;

            // Add text before match
            if (matchIndex > lastIndex) {
                fragment.appendChild(
                    document.createTextNode(text.slice(lastIndex, matchIndex))
                );
            }

            // Create highlight element
            const highlight = this.createHighlightElement(match);
            fragment.appendChild(highlight);

            lastIndex = matchIndex + match.length;
        });

        // Add remaining text
        if (lastIndex < text.length) {
            fragment.appendChild(
                document.createTextNode(text.slice(lastIndex))
            );
        }

        // Replace original node
        node.parentNode.replaceChild(fragment, node);
    }

    createHighlightElement(text) {
        const highlightId = this.generateId();
        const span = document.createElement('span');
        span.className = 'wcm-highlight';
        span.style.backgroundColor = this.settings.selectedColor;
        span.textContent = text;
        span.dataset.highlightId = highlightId;

        // Add tooltip
        const tooltip = document.createElement('span');
        tooltip.className = 'wcm-highlight-tooltip';
        tooltip.textContent = 'Click to remove';
        span.appendChild(tooltip);

        // Add click handler
        span.addEventListener('click', (e) => {
            if (e.target === span) {
                this.removeHighlight(highlightId);
            }
        });

        this.highlights.set(highlightId, {
            text,
            color: this.settings.selectedColor,
            timestamp: Date.now()
        });

        return span;
    }

    filterNode(node) {
        const span = document.createElement('span');
        span.className = `wcm-filtered wcm-${this.settings.filterMode}`;
        span.textContent = node.textContent;
        node.parentNode.replaceChild(span, node);
    }

    removeHighlight(highlightId) {
        const element = document.querySelector(`[data-highlight-id="${highlightId}"]`);
        if (element) {
            const text = element.textContent;
            const textNode = document.createTextNode(text);
            element.parentNode.replaceChild(textNode, element);
            this.highlights.delete(highlightId);
        }
    }

    clearAll() {
        // Remove highlights
        document.querySelectorAll('.wcm-highlight').forEach(element => {
            const text = element.textContent;
            const textNode = document.createTextNode(text);
            element.parentNode.replaceChild(textNode, element);
        });
        this.highlights.clear();

        // Remove filters
        document.querySelectorAll('.wcm-filtered').forEach(element => {
            const text = element.textContent;
            const textNode = document.createTextNode(text);
            element.parentNode.replaceChild(textNode, element);
        });

        // Clear processed nodes
        this.processedNodes = new WeakSet();
    }

    shouldSkipNode(node) {
        const skipTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'];
        const skipClasses = ['wcm-highlight', 'wcm-filtered'];
        
        return (
            skipTags.includes(node.tagName) ||
            skipClasses.some(className => node.classList?.contains(className)) ||
            node.isContentEditable
        );
    }

    isHighlightNode(node) {
        return node.classList?.contains('wcm-highlight') || 
               node.classList?.contains('wcm-filtered');
    }

    generateId() {
        return 'wcm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            try {
                switch (request.action) {
                    case 'updateSettings':
                        this.settings = { ...this.settings, ...request.settings };
                        this.clearAll();
                        if (this.settings.highlightEnabled || this.settings.filterEnabled) {
                            this.processContent(document.body);
                        }
                        sendResponse({ success: true });
                        break;

                    case 'clearAll':
                        this.clearAll();
                        sendResponse({ success: true });
                        break;

                    default:
                        sendResponse({ error: 'Unknown action' });
                }
            } catch (error) {
                console.error('Message handler error:', error);
                sendResponse({ error: error.message });
            }
            
            return true; // Keep message channel open
        });
    }
}

// Initialize content manager
const contentManager = new ContentManager();