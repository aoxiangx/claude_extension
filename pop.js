// This script handles the user interface logic in the popup
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings when popup opens
    chrome.storage.sync.get(['filterWords', 'highlightColor'], function(data) {
        document.getElementById('filterWords').value = data.filterWords || '';
        document.getElementById('highlightColor').value = data.highlightColor || '#ffeb3b';
    });

    // Save settings when the save button is clicked
    document.getElementById('saveSettings').addEventListener('click', function() {
        const filterWords = document.getElementById('filterWords').value;
        const highlightColor = document.getElementById('highlightColor').value;

        // Save to Chrome storage
        chrome.storage.sync.set({
            filterWords: filterWords,
            highlightColor: highlightColor
        }, function() {
            // Notify the content script to update
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateSettings',
                    filterWords: filterWords,
                    highlightColor: highlightColor
                });
            });
        });
    });
});
