// Content script to find Vimeo URLs on the page

function findVimeoUrls() {
  const vimeoData = new Map(); // Changed to Map to store id -> title pairs
  
  // Regex patterns for different Vimeo URL formats
  const vimeoPatterns = [
    /https?:\/\/vimeo\.com\/(\d+)/gi,
    /https?:\/\/player\.vimeo\.com\/video\/(\d+)/gi,
    /https?:\/\/vimeo\.com\/[\w-]+\/(\d+)/gi,
    /vimeo\.com\/(\d+)\?[^"'\s]*/gi,
    /player\.vimeo\.com\/video\/(\d+)\?[^"'\s]*/gi
  ];
  
  // Method 1: Search in page HTML
  const htmlContent = document.documentElement.innerHTML;
  vimeoPatterns.forEach(pattern => {
    const matches = htmlContent.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && !vimeoData.has(match[1])) {
        vimeoData.set(match[1], null); // Will fetch title later
      }
    }
  });
  
  // Method 2: Search in all iframes
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    if (iframe.src) {
      vimeoPatterns.forEach(pattern => {
        const matches = iframe.src.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && !vimeoData.has(match[1])) {
            // Try to get title from iframe attributes
            const title = iframe.getAttribute('title') || iframe.getAttribute('aria-label') || null;
            vimeoData.set(match[1], title);
          }
        }
      });
    }
  });
  
  // Method 3: Search in data attributes
  const elementsWithData = document.querySelectorAll('[data-vimeo-id], [data-video-id], [data-video]');
  elementsWithData.forEach(element => {
    const vimeoId = element.getAttribute('data-vimeo-id') || 
                    element.getAttribute('data-video-id') ||
                    element.getAttribute('data-video');
    if (vimeoId && /^\d+$/.test(vimeoId) && !vimeoData.has(vimeoId)) {
      // Try to get title from nearby elements
      const title = element.getAttribute('title') || 
                   element.getAttribute('aria-label') ||
                   element.getAttribute('data-title') ||
                   element.querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.trim() ||
                   null;
      vimeoData.set(vimeoId, title);
    }
  });
  
  // Method 4: Search in JSON-LD scripts
  const scripts = document.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]');
  scripts.forEach(script => {
    try {
      const content = script.textContent;
      let jsonData = null;
      try {
        jsonData = JSON.parse(content);
      } catch (e) {
        // Not valid JSON, just search the text
      }
      
      vimeoPatterns.forEach(pattern => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && !vimeoData.has(match[1])) {
            // Try to extract title from JSON data
            let title = null;
            if (jsonData) {
              title = findTitleInObject(jsonData, match[1]);
            }
            vimeoData.set(match[1], title);
          }
        }
      });
    } catch (e) {
      // Ignore errors
    }
  });
  
  // Method 5: Search in video elements with Vimeo sources
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    const sources = video.querySelectorAll('source');
    sources.forEach(source => {
      if (source.src && source.src.includes('vimeo')) {
        vimeoPatterns.forEach(pattern => {
          const matches = source.src.matchAll(pattern);
          for (const match of matches) {
            if (match[1] && !vimeoData.has(match[1])) {
              const title = video.getAttribute('title') || 
                           video.getAttribute('aria-label') || 
                           null;
              vimeoData.set(match[1], title);
            }
          }
        });
      }
    });
  });
  
  // Method 6: Search in __NEXT_DATA__ for Next.js apps
  const nextDataScript = document.querySelector('script#__NEXT_DATA__');
  if (nextDataScript) {
    try {
      const nextData = JSON.parse(nextDataScript.textContent);
      const jsonString = JSON.stringify(nextData);
      vimeoPatterns.forEach(pattern => {
        const matches = jsonString.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && !vimeoData.has(match[1])) {
            const title = findTitleInObject(nextData, match[1]);
            vimeoData.set(match[1], title);
          }
        }
      });
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // Try to fetch titles from page content for videos without titles
  enhanceTitlesFromPageContext(vimeoData);
  
  // Convert Map to array of objects
  const result = [];
  vimeoData.forEach((title, id) => {
    result.push({ id, title: title || `Vimeo Video ${id}` });
  });
  
  return result;
}

// Helper function to find title in JSON objects
function findTitleInObject(obj, videoId) {
  if (!obj || typeof obj !== 'object') return null;
  
  // Direct title properties
  if (obj.title && typeof obj.title === 'string') {
    return obj.title;
  }
  if (obj.name && typeof obj.name === 'string') {
    return obj.name;
  }
  
  // Search recursively
  for (const key in obj) {
    if (obj[key]) {
      if (typeof obj[key] === 'string' && obj[key].includes(videoId)) {
        // Found video ID, check nearby properties for title
        if (obj.title) return obj.title;
        if (obj.name) return obj.name;
        if (obj.description) return obj.description;
      } else if (typeof obj[key] === 'object') {
        const found = findTitleInObject(obj[key], videoId);
        if (found) return found;
      }
    }
  }
  
  return null;
}

// Helper function to enhance titles from page context
function enhanceTitlesFromPageContext(vimeoData) {
  // Look for title patterns near Vimeo embeds
  vimeoData.forEach((title, id) => {
    if (!title) {
      // Search for titles in text near the video ID
      const searchText = `vimeo.com/${id}`;
      const searchText2 = `player.vimeo.com/video/${id}`;
      
      // Find all text nodes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        if (node.nodeValue && (node.nodeValue.includes(searchText) || node.nodeValue.includes(searchText2))) {
          // Found reference, look for nearby heading
          let parent = node.parentElement;
          while (parent && parent !== document.body) {
            const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
            if (heading && heading.textContent) {
              vimeoData.set(id, heading.textContent.trim());
              break;
            }
            // Also check previous siblings
            let sibling = parent.previousElementSibling;
            let count = 0;
            while (sibling && count < 3) {
              const siblingHeading = sibling.querySelector('h1, h2, h3, h4, h5, h6');
              if (siblingHeading && siblingHeading.textContent) {
                vimeoData.set(id, siblingHeading.textContent.trim());
                break;
              }
              sibling = sibling.previousElementSibling;
              count++;
            }
            parent = parent.parentElement;
          }
        }
      }
    }
  });
}

// Fetch actual titles from Vimeo oEmbed API
async function fetchVimeoTitles(videoIds) {
  const titlesMap = new Map();
  
  // Batch fetch titles to avoid too many requests
  const fetchPromises = videoIds.map(async (id) => {
    try {
      const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          titlesMap.set(id, data.title);
        }
      }
    } catch (e) {
      // Silently fail for individual video
    }
  });
  
  // Wait for all fetches with a timeout
  await Promise.race([
    Promise.all(fetchPromises),
    new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
  ]);
  
  return titlesMap;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'findVimeoUrls') {
    // Check license first
    chrome.storage.local.get(['licenseValid'], (result) => {
      if (!result.licenseValid) {
        console.log('Extension not activated');
        sendResponse({ vimeoData: [] });
        return;
      }
      
      // Find videos first
      const vimeoData = findVimeoUrls();
      
      // Then fetch real titles
      const videoIds = vimeoData.map(v => v.id);
      fetchVimeoTitles(videoIds).then(titlesMap => {
        // Update titles with fetched data
        const enhancedData = vimeoData.map(video => {
          const fetchedTitle = titlesMap.get(video.id);
          return {
            id: video.id,
            title: fetchedTitle || video.title
          };
        });
        sendResponse({ vimeoData: enhancedData });
      });
    });
    
    // Return true to indicate async response
    return true;
  }
});

// Also send found URLs when page loads
window.addEventListener('load', async () => {
  // Check license first
  chrome.storage.local.get(['licenseValid'], async (result) => {
    if (!result.licenseValid) {
      console.log('Extension not activated');
      return;
    }
    
    const vimeoData = findVimeoUrls();
    if (vimeoData.length > 0) {
      // Fetch real titles
      const videoIds = vimeoData.map(v => v.id);
      const titlesMap = await fetchVimeoTitles(videoIds);
      
      // Update with fetched titles
      const enhancedData = vimeoData.map(video => {
        const fetchedTitle = titlesMap.get(video.id);
        return {
          id: video.id,
          title: fetchedTitle || video.title
        };
      });
      
      chrome.runtime.sendMessage({
        action: 'vimeoUrlsFound',
        vimeoData: enhancedData,
        url: window.location.href
      });
    }
  });
});