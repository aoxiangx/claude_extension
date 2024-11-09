document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.sync.get(
        ['filterWords', 'highlightColor', 'filterMode'], 
        function(data) {
            document.getElementById('filterWords').value = data.filterWords || '';
            document.getElementById('highlightColor').value = data.highlightColor || '#ffeb3b';
            
            // Set filter mode
            const mode = data.filterMode || 'highlight';
            document.querySelector(`input[value="${mode}"]`).checked = true;
        }
    );

    // Save settings and apply filter
    document.getElementById('saveSettings').addEventListener('click', function() {
        const filterWords = document.getElementById('filterWords').value;
        const highlightColor = document.getElementById('highlightColor').value;
        const filterMode = document.querySelector('input[name="mode"]:checked').value;

        // Save settings
        chrome.storage.sync.set({
            filterWords,
            highlightColor,
            filterMode
        }, function() {
            // Apply filter to current tab
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        action: 'updateSettings',
                        filterWords,
                        highlightColor,
                        filterMode
                    },
                    // Callback to update stats
                    function(response) {
                        if (response) {
                            document.getElementById('matchCount').textContent = 
                                `Matches found: ${response.matchCount}`;
                            document.getElementById('processTime').textContent = 
                                `Processing time: ${response.processTime}ms`;
                        }
                    }
                );
            });
        });
    });
});