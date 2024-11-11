class Highlighter {
    constructor(textProcessor) {
        this.textProcessor = textProcessor;
        this.highlights = new Map();
        this.observer = null;
        this.settings = {
            color: '#ffeb3b',
            caseSensitive: false,
            autoHighlight: false
        };
    }

    // Initialize mutation observer
    initObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver(
            Utils.debounce((mutations) => {
                if (this.settings.autoHighlight) {
                    this.processNewContent(mutations);
                }
            }, 150)
        );

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Process new content from mutations
    processNewContent(mutations) {
        try {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.highlightContent(node);
                    }
                });
            });
        } catch (error) {
            Utils.logError('Highlighter', error);
        }
    }

    // Create highlight element
    createHighlight(range, matchText) {
        const highlightId = Utils.generateUniqueId();
        const highlight = Utils.safeCreateElement('span', {
            class: 'text-highlight',
            'data-highlight-id': highlightId
        }, {
            backgroundColor: this.settings.color
        });

        try {
            range.surroundContents(highlight);
            this.highlights.set(highlightId, {
                text: matchText,
                color: this.settings.color,
                timestamp: Date.now()
            });

            highlight.addEventListener('click', () => this.removeHighlight(highlightId));
            return true;
        } catch (error) {
            Utils.logError('Highlighter', error);
            return false;
        }
    }

    // Highlight content in a node
    highlightContent(root) {
        const walker = this.textProcessor.createTextWalker(root);
        let node;
        
        while (node = walker.nextNode()) {
            try {
                const matches = this.textProcessor.processText(
                    node.textContent,
                    this.settings.pattern,
                    this.settings.caseSensitive
                );

                if (matches.length > 0) {
                    matches.forEach(match => {
                        const range = document.createRange();
                        range.selectNode(node);
                        this.createHighlight(range, match);
                    });
                }
            } catch (error) {
                Utils.logError('Highlighter', error);
            }
        }
    }

    // Remove specific highlight
    removeHighlight(highlightId) {
        try {
            const element = document.querySelector(`[data-highlight-id="${highlightId}"]`);
            if (element) {
                const parent = element.parentNode;
                const textContent = element.textContent;
                parent.replaceChild(document.createTextNode(textContent), element);
                this.highlights.delete(highlightId);
                return true;
            }
        } catch (error) {
            Utils.logError('Highlighter', error);
        }
        return false;
    }

    // Remove all highlights
    removeAllHighlights() {
        try {
            document.querySelectorAll('.text-highlight').forEach(element => {
                const parent = element.parentNode;
                const textContent = element.textContent;
                parent.replaceChild(document.createTextNode(textContent), element);
            });
            this.highlights.clear();
            return true;
        } catch (error) {
            Utils.logError('Highlighter', error);
            return false;
        }
    }

    // Update settings
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        if (this.settings.autoHighlight) {
            this.highlightContent(document.body);
        }
    }
}