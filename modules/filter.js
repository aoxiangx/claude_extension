class ContentFilter {
    constructor(textProcessor) {
        this.textProcessor = textProcessor;
        this.settings = {
            keywords: [],
            caseSensitive: false,
            mode: 'hide' // 'hide' or 'highlight'
        };
    }

    // Create filter pattern from keywords
    createFilterPattern() {
        if (!this.settings.keywords.length) return null;
        
        try {
            const escapedWords = this.settings.keywords.map(word => 
                word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            );
            return escapedWords.join('|');
        } catch (error) {
            Utils.logError('ContentFilter', error);
            return null;
        }
    }

    // Filter content in a node
    filterContent(root) {
        const pattern = this.createFilterPattern();
        if (!pattern) return;

        const walker = this.textProcessor.createTextWalker(root);
        let node;
        
        while (node = walker.nextNode()) {
            try {
                const matches = this.textProcessor.processText(
                    node.textContent,
                    pattern,
                    this.settings.caseSensitive
                );

                if (matches.length > 0) {
                    if (this.settings.mode === 'hide') {
                        this.hideContent(node);
                    } else {
                        this.markContent(node);
                    }
                }
            } catch (error) {
                Utils.logError('ContentFilter', error);
            }
        }
    }

    // Hide matched content
    hideContent(node) {
        try {
            const span = Utils.safeCreateElement('span', {
                class: 'filtered-content hidden'
            });
            span.textContent = node.textContent;
            node.parentNode.replaceChild(span, node);
        } catch (error) {
            Utils.logError('ContentFilter', error);
        }
    }

    // Mark filtered content
    markContent(node) {
        try {
            const span = Utils.safeCreateElement('span', {
                class: 'filtered-content marked'
            });
            span.textContent = node.textContent;
            node.parentNode.replaceChild(span, node);
        } catch (error) {
            Utils.logError('ContentFilter', error);
        }
    }

    // Update filter settings
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.filterContent(document.body);
    }
}