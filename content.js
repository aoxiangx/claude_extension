// This script runs in the context of web pages
let settings = {
    filterWords: '',
    highlightColor: '#ffeb3b'
};

// Function to highlight text on the page
function highlightContent() {
    // Remove existing highlights
    const highlights = document.querySelectorAll('span.extension-highlight');
    highlights.forEach(h => {
        const parent = h.parentNode;
        parent.replaceChild(document.createTextNode(h.textContent), h);
    });

    if (!settings.filterWords) return;

    const words = settings.filterWords.split(',').map(word => word.trim());
    if (words.length === 0) return;

    // Create a regular expression for matching words
    const regex = new RegExp(`(${words.join('|')})`, 'gi');

    // Function to process text nodes
    function processNode(node) {
        if (node.nodeType === 3) { // Text node
            const matches = node.textContent.match(regex);
            if (matches) {
                const span = document.createElement('span');
                span.innerHTML = node.textContent.replace(regex, 
                    `<span class="extension-highlight" style="background-color: ${settings.highlightColor}">$1</span>`
                );
                node.parentNode.replaceChild(span, node);
            }
        } else if (node.nodeType === 1) { // Element node
            // Skip script and style elements
            if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                Array.from(node.childNodes).forEach(processNode);
            }
        }
    }

    // Process the entire document body
    processNode(document.body);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateSettings') {
        settings.filterWords = request.filterWords;
        settings.highlightColor = request.highlightColor;
        highlightContent();
    }
});

// Load settings when the content script first runs
chrome.storage.sync.get(['filterWords', 'highlightColor'], function(data) {
    settings = {
        filterWords: data.filterWords || '',
        highlightColor: data.highlightColor || '#ffeb3b'
    };
    highlightContent();
});