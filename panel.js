// panel.js - Logic for the DevTools panel UI

document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.getElementById('generatePo');
    const copyButton = document.getElementById('copyButton');
    const outputDiv = document.getElementById('output');

    generateButton.addEventListener('click', async function() { // Make async to await message sending logic
        outputDiv.textContent = 'Analyzing DOM with local classifier...';
        copyButton.style.display = 'none';
        updateStatus('working', 'Analyzing page...');

        try {
            // DevTools scripts don't have direct access to chrome.tabs.sendMessage directly
            // to the inspected window's tab ID.
            // Instead, we use chrome.devtools.inspectedWindow.eval to run code
            // within the context of the inspected page.
            // Or, we can message the background script, which then messages the content script.
            // Using background script as a relay is often more robust for simple messages.

            // Send message to background script to relay to content script
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { action: "generatePageObjectForDevTools" }, // Action for background script
                    function(res) {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(res);
                        }
                    }
                );
            });

            if (response && response.pageObjectCode) {
                outputDiv.textContent = response.pageObjectCode;
                copyButton.style.display = 'block';
                updateStatus('ready', 'Page object generated successfully');
            } else {
                outputDiv.textContent = 'No elements found or an error occurred during analysis.';
                copyButton.style.display = 'none';
                updateStatus('error', 'No elements found');
            }
        } catch (error) {
            outputDiv.textContent = `Error: ${error.message || 'Could not communicate with the inspected page.'}`;
            console.error('Error in DevTools panel:', error);
            copyButton.style.display = 'none';
            updateStatus('error', 'Communication error');
        }
    });

    copyButton.addEventListener('click', function() {
        const textToCopy = outputDiv.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy text. Please copy manually.');
        });
    });

    copyButton.style.display = 'none'; // Initial state

    function updateStatus(state, message) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const loadingSpinner = document.getElementById('loadingSpinner');

        statusIndicator.className = `status-indicator ${state}`;
        statusText.textContent = message;

        if (state === 'working') {
            loadingSpinner.style.display = 'inline-block';
        } else {
            loadingSpinner.style.display = 'none';
        }
    }
});