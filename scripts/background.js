// Background Service Worker for Manifest V3 extension

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-links-local') {
    // Find the active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        // Send a message to the content script of the active tab
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-links-local' })
          .catch((error) => {
            // Ignore error when content script is not loaded on this tab (e.g. chrome:// tabs)
            console.log('Could not send toggle message (content script might not be active on this page):', error.message);
          });
      }
    });
  }
});
