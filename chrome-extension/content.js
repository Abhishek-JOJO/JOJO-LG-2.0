window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data && event.data.type === "JOJO_ANALYTICS_EVENT") {
    console.log("[JOJO Analytics Helper] Intercepted event:", event.data.payload.event.name);
    chrome.runtime.sendMessage({
      type: "ANALYTICS_EVENT_INTERCEPTED",
      payload: event.data.payload
    });
  }
});

console.log("[JOJO Analytics Helper] Content script injected and listening via postMessage.");
