// devtools.js - Creates the custom panel in Chrome DevTools

chrome.devtools.panels.create(
    "WebdriverIO PO Generator", // Title of the panel
    "icons/icon16.png", // Icon for the panel (optional, but good practice)
    "panel.html", // HTML file for the panel UI
    function(panel) {
        // Code to run when the panel is created (optional)
        console.log("WebdriverIO PO Generator DevTools panel created.");

        // Example: You could establish a port here for long-lived communication
        // between the DevTools panel and the content script/background script.
        // For simplicity, we'll stick to one-time messages via background.js for now.
    }
);