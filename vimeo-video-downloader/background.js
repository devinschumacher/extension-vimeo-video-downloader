// Background service worker

// Store found Vimeo IDs for each tab
const vimeoData = {};

// License validation regex
const LICENSE_KEY_REGEX = /^[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}$/;

// Check license on extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get(['licenseKey', 'licenseValid']);
  if (!result.licenseKey || !result.licenseValid) {
    // Set badge to indicate inactive state
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }
});

// Check license status on startup
chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get(['licenseKey', 'licenseValid']);
  if (!result.licenseKey || !result.licenseValid) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'vimeoUrlsFound' && sender.tab) {
    // Store the Vimeo data for this tab
    vimeoData[sender.tab.id] = {
      vimeoData: request.vimeoData,
      url: request.url,
      title: sender.tab.title
    };
    
    // Only update badge if extension is activated
    chrome.storage.local.get(['licenseValid'], (result) => {
      if (result.licenseValid) {
        // Update badge to show number of videos found
        chrome.action.setBadgeText({
          text: request.vimeoData.length.toString(),
          tabId: sender.tab.id
        });
        chrome.action.setBadgeBackgroundColor({
          color: '#4CAF50',
          tabId: sender.tab.id
        });
      }
    });
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete vimeoData[tabId];
});

// Handle requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVimeoData') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;
      sendResponse({ data: vimeoData[tabId] || null });
    });
    return true; // Will respond asynchronously
  }
  
  // License verification
  if (request.action === 'verifyLicense') {
    const licenseKey = request.licenseKey;
    
    // Validate license key format
    if (!LICENSE_KEY_REGEX.test(licenseKey)) {
      sendResponse({ success: false, error: 'Invalid license key format' });
      return;
    }
    
    // TODO: For production, you should verify the license key with Gumroad's API
    // This would require setting up a proxy server to keep your Gumroad API credentials secure
    
    // For now, just check the format and save it
    chrome.storage.local.set({
      licenseKey: licenseKey,
      licenseValid: true,
      activatedAt: new Date().toISOString()
    }, () => {
      // Clear the warning badge
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ success: true });
    });
    
    return true; // Will respond asynchronously
  }
  
  // Check license status
  if (request.action === 'checkLicense') {
    chrome.storage.local.get(['licenseKey', 'licenseValid'], (result) => {
      sendResponse({
        licenseValid: result.licenseValid || false,
        licenseKey: result.licenseKey || null
      });
    });
    return true; // Will respond asynchronously
  }
  
  // Clear license
  if (request.action === 'clearLicense') {
    chrome.storage.local.remove(['licenseKey', 'licenseValid', 'activatedAt'], () => {
      // Set warning badge
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      sendResponse({ success: true });
    });
    return true; // Will respond asynchronously
  }
});