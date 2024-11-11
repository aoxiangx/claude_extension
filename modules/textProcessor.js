// modules/textProcessor.js
class TextProcessor {
    constructor() {
        this.processedNodes = new WeakSet();
    }

    // Process text content with regex
    processText(text, pattern, caseSensitive = false) {
        try {
            const flags = caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(pattern, flags);
            return text.match(regex) || [];
        } catch (error) {
            Utils.logError('TextProcessor', error);
            return [];
        }
    }

    // Create text walker for efficient DOM traversal
    createTextWalker(root) {
        return document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                    
                    const parent = node.parentNode;
                    if (parent.tagName === 'SCRIPT' || 
                        parent.tagName === 'STYLE' || 
                        parent.tagName === 'TEXTAREA' || 
                        parent.tagName === 'INPUT' ||
                        this.processedNodes.has(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
    }
}