const Utils = {
    // Debounce function for performance optimization
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
    },

    // Generate unique IDs for elements
    generateUniqueId() {
        return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    // Safe DOM manipulation
    safeCreateElement(tag, attributes = {}, styles = {}) {
        try {
            const element = document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
            Object.entries(styles).forEach(([key, value]) => {
                element.style[key] = value;
            });
            return element;
        } catch (error) {
            console.error('Error creating element:', error);
            return null;
        }
    },

    // Error logging with context
    logError(context, error) {
        console.error(`[${context}] Error:`, error);
        // Could integrate with error tracking service here
    }
};