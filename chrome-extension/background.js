let eventLogs = [];

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYTICS_EVENT_INTERCEPTED") {
    // Store in memory
    eventLogs.unshift(message.payload); // Add to front of array
    
    // Keep max 500 events to prevent memory bloat
    if (eventLogs.length > 500) {
      eventLogs.pop();
    }
    
    // Optionally persist to storage
    chrome.storage.local.set({ jojoEvents: eventLogs });

    // Forward to popup if it's open
    chrome.runtime.sendMessage({
      type: "NEW_EVENT",
      payload: message.payload
    }).catch(() => {
      // Ignore error if popup is closed
    });
  }
});

// Load existing events from storage on startup
chrome.storage.local.get(["jojoEvents"], (result) => {
  if (result.jojoEvents) {
    eventLogs = result.jojoEvents;
  }
});

// Handle requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_EVENTS") {
    sendResponse(eventLogs);
  } else if (message.type === "CLEAR_EVENTS") {
    eventLogs = [];
    chrome.storage.local.set({ jojoEvents: [] });
    sendResponse(true);
  }
});

// Configure side panel to open on action click
if (chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
}
