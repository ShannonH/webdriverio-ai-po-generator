// background.js - Service Worker
console.log("WebdriverIO PO Generator background script loaded.");

// Listen for messages from DevTools panel (or popup, if still active)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if the message is from our DevTools panel (or action)
    if (request.action === "generatePageObjectForDevTools") {
        console.log("Background script: Received message from DevTools panel. Relaying to content script.");

        // To send a message to the content script of the *currently inspected tab*,
        // we can often use chrome.tabs.query to find the active tab.
        // In DevTools context, chrome.devtools.inspectedWindow.tabId can be used,
        // but for simplicity and robustness, using chrome.tabs.query for the active tab
        // is often sufficient and works well when triggered from the DevTools panel.

        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length === 0 || !tabs[0].id) {
                console.error("Background script: No active tab found to relay message.");
                sendResponse({ error: "No active tab found." });
                return;
            }

            const activeTabId = tabs[0].id;
            // Send the message to the content script in the active tab
            chrome.tabs.sendMessage(activeTabId, { action: "generatePageObject" }, function(contentResponse) {
                if (chrome.runtime.lastError) {
                    // Handle errors, e.g., content script not injected yet
                    console.error("Background script: Error relaying message to content script:", chrome.runtime.lastError.message);
                    sendResponse({ error: "Failed to communicate with content script." });
                    return;
                }
                // Relay the content script's response back to the DevTools panel
                console.log("Background script: Received response from content script. Relaying to DevTools panel.");
                sendResponse(contentResponse);
            });
        });
        return true; // Indicate that sendResponse will be called asynchronously
    }
});