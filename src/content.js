// content.js - Injected into the web page to analyze the DOM.
import {classifyElement} from './local_classifier.js'; // Import the async classifier

console.log("Content script 'content.js' has started running!");

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Message received in content script:", request);
    if (request.action === "generatePageObject") {
        console.log("Action is 'generatePageObject'. Proceeding to analyze DOM with TF.js.");
        // Call the async function and handle the promise
        generatePageObjectFromDOM().then(pageObject => {
            console.log("Page object generated. Sending response.");
            sendResponse({ pageObjectCode: pageObject });
        }).catch(error => {
            console.error("Error during page object generation:", error);
            sendResponse({ pageObjectCode: `Error: ${error.message || error}` });
        });
        return true; // Indicate that we will send a response asynchronously
    }
});

/**
 * Generates a WebdriverIO Page Object class from the current page's DOM.
 * This version uses the `classifyElement` (now TF.js-powered) for smarter analysis.
 * @returns {Promise<string>}
 */
async function generatePageObjectFromDOM() { // Make this function async
    let pageObjectMethods = [];
    const elements = document.querySelectorAll('input, button, a, select, textarea, h1, h2, h3, h4, h5, h6, p, div[role="button"], span[role="button"], [data-test-id], [data-qa], [data-cy]');

    for (const el of elements) { // Use for...of for async iteration
        const elementInfo = {
            id: el.id,
            className: el.className,
            tagName: el.tagName.toLowerCase(),
            name: el.name,
            type: el.type,
            role: el.getAttribute('role'),
            textContent: el.textContent.trim().replace(/\s+/g, ' '),
            dataAttributes: {},
            ariaLabel: el.getAttribute('aria-label')
        };

        for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            if (attr.name.startsWith('data-')) {
                elementInfo.dataAttributes[attr.name] = attr.value;
            }
        }

        // Use our local classifier to get a prediction for the element type
        // AWAIT the classification as it's now asynchronous
        const classification = await classifyElement(elementInfo);

        let selector = null;
        let propertyName = null;

        // Prioritize selectors based on best practices and classification
        // 1. Data Attributes (highest priority for testing)
        if (elementInfo.dataAttributes['data-test-id']) {
            selector = `[data-test-id="${elementInfo.dataAttributes['data-test-id']}"]`;
            propertyName = camelCase(`${elementInfo.dataAttributes['data-test-id']} ${classification.type}`);
        } else if (elementInfo.dataAttributes['data-qa']) {
            selector = `[data-qa="${elementInfo.dataAttributes['data-qa']}"]`;
            propertyName = camelCase(`${elementInfo.dataAttributes['data-qa']} ${classification.type}`);
        } else if (elementInfo.dataAttributes['data-cy']) {
            selector = `[data-cy="${elementInfo.dataAttributes['data-cy']}"]`;
            propertyName = camelCase(`${elementInfo.dataAttributes['data-cy']} ${classification.type}`);
        }

        // 2. ID (if present and valid)
        if (!selector && elementInfo.id && !elementInfo.id.includes(' ') && document.querySelectorAll(`#${elementInfo.id}`).length === 1) {
            selector = `#${elementInfo.id}`;
            propertyName = camelCase(`${elementInfo.id} ${classification.type}`);
        }

        // 3. Name Attribute (common for form fields)
        if (!selector && elementInfo.name) {
            selector = `[name="${elementInfo.name}"]`;
            propertyName = camelCase(`${elementInfo.name} ${classification.type}`);
        }

        // 4. Text Content (for buttons, links, headings) or Aria-label - FIXED LOGIC
        // Using classification.type to inform when text is a good primary selector strategy.
        if (!selector && ['button', 'link', 'heading', 'label', 'actionElement', 'searchButton', 'accountLink'].includes(classification.type)) {
            const preferredText = elementInfo.ariaLabel || elementInfo.textContent;
            if (preferredText) {
                const targetTagName = elementInfo.tagName;
                const elementsWithMatchingText = Array.from(document.querySelectorAll(targetTagName))
                    .filter(elMatch => { // Renamed to elMatch to avoid conflict with `el` loop variable
                        const elMatchText = (elMatch.ariaLabel || elMatch.textContent || '').trim().replace(/\s+/g, ' ');
                        return elMatchText === preferredText;
                    });

                // Check if the current 'el' is among the matching elements
                if (elementsWithMatchingText.includes(el)) {
                    if (elementsWithMatchingText.length === 1) {
                        selector = `${targetTagName}=${preferredText}`;
                        propertyName = camelCase(`${preferredText} ${classification.type}`);
                    } else {
                        // If not unique, we still suggest the text-based selector
                        selector = `${targetTagName}=${preferredText}`;
                        propertyName = camelCase(`${preferredText} ${classification.type}`);
                        // Add a numeric suffix if it's not the first element in the found matches
                        const index = elementsWithMatchingText.indexOf(el);
                        if (index !== -1) {
                            propertyName += (index + 1);
                        }
                    }
                }
            }
        }


        // 5. Unique Class Name (simple check for now)
        if (!selector && elementInfo.className && typeof elementInfo.className === 'string') {
            const classNames = elementInfo.className.split(' ').filter(name => name.trim() !== '');
            for (const cls of classNames) {
                if (cls && document.querySelectorAll(`.${cls}`).length === 1) {
                    selector = `.${cls}`;
                    propertyName = camelCase(`${cls} ${classification.type}`);
                    break;
                }
            }
        }

        // 6. Generic Type-based Selector (less robust but always available)
        if (!selector) {
            selector = elementInfo.tagName;
            propertyName = camelCase(`${elementInfo.tagName} ${classification.type}Generic`);
            if (elementInfo.tagName === 'input' && elementInfo.type) {
                selector = `${elementInfo.tagName}[type="${elementInfo.type}"]`;
                propertyName = camelCase(`${elementInfo.type}Input`);
            } else if (elementInfo.role) {
                selector = `${elementInfo.tagName}[role="${elementInfo.role}"]`;
                propertyName = camelCase(`${elementInfo.role} ${elementInfo.tagName}`);
            }
        }

        if (propertyName && selector) {
            let originalPropertyName = propertyName;
            let counter = 1;
            while (pageObjectMethods.some(method => method.includes(`get ${propertyName}()`))) {
                propertyName = `${originalPropertyName}${counter++}`;
            }
            pageObjectMethods.push(`    get ${propertyName}() { return $('${selector}'); }`);
        }
    }

    return `
// Generated by Local AI PO Generator (with TF.js)

class MyPage {
${pageObjectMethods.join('\n')}

    /**
     * Optional: Add an open method if this page has a direct URL
     * open() {
     * return super.open('path/to/my/page');
     * }
     */
}

export default new MyPage();
`;
}

/**
 * Converts a string to camelCase.
 * @param {string} str
 * @returns {string}
 */
function camelCase(str) {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/^\w|[A-Z]|\b\w/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '')
        .replace(/-/g, '');
}