// Popup script

document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const videoListDiv = document.getElementById('videoList');
  const inactiveSection = document.getElementById('inactive-section');
  const activeSection = document.getElementById('active-section');
  const contentSection = document.getElementById('content-section');
  const licenseInput = document.getElementById('license-input');
  const activateBtn = document.getElementById('activate-btn');
  const deactivateBtn = document.getElementById('deactivate-btn');
  const errorMessage = document.getElementById('error-message');
  
  // Check license status first
  chrome.runtime.sendMessage({ action: 'checkLicense' }, (response) => {
    if (response && response.licenseValid) {
      showActivatedState();
      initializeVideoSearch();
    } else {
      showInactiveState();
    }
  });
  
  // License activation handler
  activateBtn.addEventListener('click', async () => {
    const licenseKey = licenseInput.value.trim();
    
    if (!licenseKey) {
      showError('Please enter a license key');
      return;
    }
    
    chrome.runtime.sendMessage({ action: 'verifyLicense', licenseKey }, (response) => {
      if (response.success) {
        showActivatedState();
        initializeVideoSearch();
        errorMessage.textContent = '';
      } else {
        showError(response.error || 'Invalid license key. Please check and try again.');
      }
    });
  });
  
  // License deactivation handler
  deactivateBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clearLicense' }, () => {
      showInactiveState();
      videoListDiv.innerHTML = '';
    });
  });
  
  function showInactiveState() {
    inactiveSection.style.display = 'block';
    activeSection.style.display = 'none';
    contentSection.style.display = 'none';
  }
  
  function showActivatedState() {
    inactiveSection.style.display = 'none';
    activeSection.style.display = 'block';
    contentSection.style.display = 'block';
  }
  
  function showError(message) {
    errorMessage.textContent = message;
    setTimeout(() => {
      errorMessage.textContent = '';
    }, 3000);
  }
  
  function initializeVideoSearch() {
    // First, check if we have stored data from background
    chrome.runtime.sendMessage({ action: 'getVimeoData' }, (response) => {
      if (response && response.data && response.data.vimeoData && response.data.vimeoData.length > 0) {
        displayVideos(response.data.vimeoData);
      } else {
        // If no stored data, query the content script
        queryContentScript();
      }
    });
  }
  
  async function queryContentScript() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      chrome.tabs.sendMessage(tab.id, { action: 'findVimeoUrls' }, (response) => {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = 'Error: Could not scan page. Try refreshing.';
          statusDiv.className = 'status error';
        } else if (response && response.vimeoData && response.vimeoData.length > 0) {
          displayVideos(response.vimeoData);
        } else {
          statusDiv.textContent = 'No Vimeo videos found on this page.';
          statusDiv.className = 'status empty';
        }
      });
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      statusDiv.className = 'status error';
    }
  }
  
  function displayVideos(vimeoData) {
    statusDiv.textContent = `Found ${vimeoData.length} Vimeo video${vimeoData.length > 1 ? 's' : ''}:`;
    statusDiv.className = 'status success';
    
    videoListDiv.innerHTML = '';
    
    vimeoData.forEach((video, index) => {
      const videoItem = createVideoItem(video, index + 1);
      videoListDiv.appendChild(videoItem);
    });
  }
  
  function createVideoItem(video, number) {
    const item = document.createElement('div');
    item.className = 'video-item';
    
    const vimeoId = video.id;
    const title = video.title;
    const playerUrl = `https://player.vimeo.com/video/${vimeoId}`;
    const safeFilename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const streamlinkCommand = `streamlink "${playerUrl}" best --hls-audio-select "*" -o "${safeFilename}_${vimeoId}.mp4" 2>&1`;
    
    item.innerHTML = `
      <div class="video-header">
        <span class="video-number">#${number}</span>
        <div class="video-info">
          <div class="video-title">${title}</div>
          <span class="video-id">ID: ${vimeoId}</span>
        </div>
      </div>
      <div class="video-urls">
        <div class="url-item">
          <span class="url-label">Vimeo:</span>
          <a href="https://vimeo.com/${vimeoId}" target="_blank">vimeo.com/${vimeoId}</a>
        </div>
        <div class="url-item">
          <span class="url-label">Player:</span>
          <a href="${playerUrl}" target="_blank">player.vimeo.com/video/${vimeoId}</a>
        </div>
      </div>
      <div class="command-section">
        <div class="command-label">Streamlink command:</div>
        <div class="command-box">
          <code>${streamlinkCommand}</code>
          <button class="copy-button" data-command="${streamlinkCommand.replace(/"/g, '&quot;').replace(/\*/g, '&#42;')}">
            Copy Command
          </button>
        </div>
      </div>
    `;
    
    // Add click handlers for copy buttons
    const copyButtons = item.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
      button.addEventListener('click', () => {
        const command = button.getAttribute('data-command')
          .replace(/&quot;/g, '"')
          .replace(/&#42;/g, '*');
        copyToClipboard(command);
        
        // Visual feedback
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('copied');
        }, 2000);
      });
    });
    
    return item;
  }
  
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
});