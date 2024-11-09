class ContentFilter {
    constructor() {
        this.settings = {
            filterWords: '',
            highlightColor: '#ffeb3b',
            filterMode: 'highlight'
        };
        
        // Performance optimization: Debounce the filtering
        this.debouncedFilter = this.debounce(this.processPage.bind(this), 150);
        
        // Initialize observer for dynamic content
        this.observer = null;
        
        // Keep track of processed nodes
        this.processedNodes = new WeakSet();
    }

    // Utility function to debounce frequent calls
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Initialize the mutation observer for dynamic content
    initObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldProcess = true;
                    break;
                }
            }
            if (shouldProcess) {
                this.debouncedFilter();
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Create regex from keywords
    createSearchRegex() {
        if (!this.settings.filterWords) return null;
        
        const words = this.settings.filterWords
            .split(',')
            .map(word => word.trim())
            .filter(word => word.length > 0)
            .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex special chars
        
        return words.length > 0 ? new RegExp(`(${words.join('|')})`, 'gi') : null;
    }

    // Process a text node
    processTextNode(node, regex) {
        const matches = node.textContent.match(regex);
        if (!matches) return 0;

        const span = document.createElement('span');
        
        if (this.settings.filterMode === 'highlight') {
            span.innerHTML = node.textContent.replace(regex, 
                `<span class="extension-highlight" style="background-color: ${this.settings.highlightColor}">$1</span>`
            );
        } else { // hide mode
            span.innerHTML = node.textContent.replace(regex,
                `<span class="extension-hidden" style="display: none;">$1</span>`
            );
        }
        
        node.parentNode.replaceChild(span, node);
        return matches.length;
    }

    // Main processing function
    processPage() {
        const startTime = performance.now();
        let matchCount = 0;
        
        // Remove existing highlights/hidden elements
        const existingElements = document.querySelectorAll('.extension-highlight, .extension-hidden');
        existingElements.forEach(el => {
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
        });

        const regex = this.createSearchRegex();
        if (!regex) return { matchCount: 0, processTime: 0 };

        // Process text nodes in chunks using TreeWalker
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip script and style contents
                    if (node.parentNode.tagName === 'SCRIPT' ||
                        node.parentNode.tagName === 'STYLE' ||
                        node.parentNode.tagName === 'TEXTAREA' ||
                        node.parentNode.className.includes('extension-')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const processChunk = () => {
            const chunkSize = 50; // Process 50 nodes at a time
            let nodesToProcess = [];
            
            // Collect nodes for processing
            for (let i = 0; i < chunkSize; i++) {
                const node = walker.nextNode();
                if (!node) break;
                nodesToProcess.push(node);
            }
            
            // If no more nodes, we're done
            if (nodesToProcess.length === 0) {
                const processTime = Math.round(performance.now() - startTime);
                chrome.runtime.sendMessage({
                    action: 'filterComplete',
                    stats: { matchCount, processTime }
                });
                return;
            }
            
            // Process this chunk
            nodesToProcess.forEach(node => {
                if (!this.processedNodes.has(node)) {
                    matchCount += this.processTextNode(node, regex);
                    this.processedNodes.add(node);
                }
            });
            
            // Schedule next chunk
            requestAnimationFrame(processChunk);
        };

        // Start processing
        requestAnimationFrame(processChunk);
        
        return { matchCount, processTime: Math.round(performance.now() - startTime) };
    }

    // Update settings and reprocess
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        return this.processPage();
    }
}

// Initialize the content filter
const contentFilter = new ContentFilter();

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateSettings') {
        const stats = contentFilter.updateSettings({
            filterWords: request.filterWords,
            highlightColor: request.highlightColor,
            filterMode: request.filterMode
        });
        sendResponse(stats);
    }
    return true; // Keep message channel open for async response
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
        
        // Initialize observer for dynamic content
        contentFilter.initObserver();
    }
);