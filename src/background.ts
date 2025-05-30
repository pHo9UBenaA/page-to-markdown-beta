/// <reference types="npm:@types/chrome" />

chrome.action.onClicked.addListener(() => {
  console.log("Hello from the background script!");
});
