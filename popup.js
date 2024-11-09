document.addEventListener('DOMContentLoaded', function() {
    const filterWordsInput = document.getElementById('filterWords');
    const highlightModeRadio = document.getElementById('highlightMode');
    const hideModeRadio = document.getElementById('hideMode');
    const highlightColorInput = document.getElementById('highlightColor');
    const colorPickerContainer = document.getElementById('colorPickerContainer');
    const saveButton = document.getElementById('saveSettings');
    const statusDiv = document.getElementById('status');

    // Handle filter mode change
    function handleFilterModeChange() {
        colorPickerContainer.style.display = 
            highlightModeRadio.checked ? 'block' : 'none';
    }

    highlightModeRadio.addEventListener('change', handleFilterModeChange);
    hideModeRadio.addEventListener('change', handleFilterModeChange);

    // Load saved settings
    chrome.storage.sync.get(
        ['filterWords', 'highlightColor', 'filterMode'],
        function(data) {
            filterWordsInput.value = data.filterWords || '';
            highlightColorInput.value = data.highlightColor || '#ffeb3b';
            
            if (data.filterMode === 'hide') {
                hideModeRadio.checked = true;
            } else {
                highlightModeRadio.checked = true;
            }
            
            handleFilterModeChange();
        }
    );

    // Show status message
    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'error' : 'success';
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    // Save settings and apply filter
    saveButton.addEventListener('click', function() {
        const settings = {
            filterWords: filterWordsInput.value,
            highlightColor: highlightColorInput.value,
            filterMode: document.querySelector('input[name="mode"]:checked').value
        };

        chrome.storage.sync.set(settings, function() {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings', true);
                return;
            }

            // Apply filter to current tab
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        action: 'updateSettings',
                        ...settings
                    },
                    function(response) {
                        if (chrome.runtime.lastError) {
                            showStatus('Error applying filter', true);
                            return;
                        }

                        if (response) {
                            document.getElementById('matchCount').textContent = 
                                `Matches found: ${response.matchCount}`;
                            document.getElementById('processTime').textContent = 
                                `Processing time: ${response.processTime}ms`;
                            showStatus('Filter applied successfully');
                        }
                    }
                );
            });
        });
    });
});