document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const activeTabStatus = document.getElementById('activeTabStatus');
  const currentDomainEl = document.getElementById('currentDomain');
  const btnQuickWhitelist = document.getElementById('btnQuickWhitelist');
  const currentSiteBanner = document.getElementById('currentSiteBanner');
  const chkGlobalHostname = document.getElementById('chkGlobalHostname');
  
  const whitelistCount = document.getElementById('whitelistCount');
  const whitelistItemsList = document.getElementById('whitelistItemsList');
  const emptyState = document.getElementById('emptyState');
  
  const toggleAddForm = document.getElementById('toggleAddForm');
  const addSiteForm = document.getElementById('addSiteForm');
  const inputDomain = document.getElementById('inputDomain');
  const inputSelector = document.getElementById('inputSelector');
  const formError = document.getElementById('formError');
  const shortcutKeyEl = document.getElementById('shortcutKey');
  
  const whitelistItemTemplate = document.getElementById('whitelistItemTemplate');

  let currentTabDomain = '';
  let whitelist = [];
  let showJustHostnameGlobal = false;

  // 1. Load data from chrome.storage
  function loadSettings(callback) {
    chrome.storage.local.get({ whitelist: [], showJustHostnameGlobal: false }, (data) => {
      whitelist = data.whitelist;
      showJustHostnameGlobal = data.showJustHostnameGlobal;
      if (callback) callback();
    });
  }

  // 2. Save data to chrome.storage
  function saveSettings(callback) {
    chrome.storage.local.set({ whitelist, showJustHostnameGlobal }, () => {
      updateUI();
      if (callback) callback();
    });
  }

  // 3. Extract domain and check active tab status
  function initActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].url) {
        currentDomainEl.textContent = 'No active webpage';
        btnQuickWhitelist.disabled = true;
        return;
      }

      const rawUrl = tabs[0].url;
      if (rawUrl.startsWith('chrome://') || rawUrl.startsWith('chrome-extension://') || rawUrl.startsWith('edge://') || rawUrl.startsWith('about:')) {
        currentDomainEl.textContent = 'System pages not supported';
        btnQuickWhitelist.disabled = true;
        btnQuickWhitelist.textContent = 'Unavailable';
        return;
      }

      try {
        const urlObj = new URL(rawUrl);
        currentTabDomain = urlObj.hostname;
        currentDomainEl.textContent = currentTabDomain;
        
        // Check if domain is already whitelisted
        const isWhitelisted = whitelist.some(item => matchHost(currentTabDomain, item.domainPattern));
        if (isWhitelisted) {
          btnQuickWhitelist.textContent = 'Remove Site';
          btnQuickWhitelist.classList.remove('btn-primary');
          btnQuickWhitelist.classList.add('btn-danger');
        } else {
          btnQuickWhitelist.textContent = 'Whitelist Site';
          btnQuickWhitelist.classList.remove('btn-danger');
          btnQuickWhitelist.classList.add('btn-primary');
        }
      } catch (e) {
        currentDomainEl.textContent = 'Invalid page URL';
        btnQuickWhitelist.disabled = true;
      }
    });
  }

  // Helper function to check if domain matches whitelist pattern (e.g. subdomains)
  function matchHost(hostname, pattern) {
    const cleanHost = hostname.toLowerCase().trim();
    const cleanPattern = pattern.toLowerCase().trim();
    return cleanHost === cleanPattern || cleanHost.endsWith('.' + cleanPattern);
  }

  // 4. Update the complete Popup UI
  function updateUI() {
    // Update global hostname checkbox
    if (chkGlobalHostname) {
      chkGlobalHostname.checked = showJustHostnameGlobal;
    }

    // Update count badge
    whitelistCount.textContent = whitelist.length;
    
    // Clear list but preserve emptyState
    const cards = whitelistItemsList.querySelectorAll('.whitelist-card');
    cards.forEach(card => card.remove());

    if (whitelist.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      
      // Populate list
      whitelist.forEach((item) => {
        const clone = whitelistItemTemplate.content.cloneNode(true);
        const card = clone.querySelector('.whitelist-card');
        const domainSpan = clone.querySelector('.card-domain');
        const activeToggle = clone.querySelector('.site-enable-toggle');
        const deleteBtn = clone.querySelector('.btn-delete');
        const selectorInput = clone.querySelector('.card-selector-input');
        const saveBtn = clone.querySelector('.btn-save-selector');
        const formatSelect = clone.querySelector('.card-format-select');

        domainSpan.textContent = item.domainPattern;
        activeToggle.checked = item.isEnabled;
        selectorInput.value = item.selector || '';
        formatSelect.value = item.urlFormat || 'default';

        // Gray out input if disabled
        if (!item.isEnabled) {
          selectorInput.disabled = true;
          formatSelect.disabled = true;
          card.style.opacity = '0.6';
        }

        // Toggle Switch handler
        activeToggle.addEventListener('change', () => {
          item.isEnabled = activeToggle.checked;
          if (!item.isEnabled) {
            selectorInput.disabled = true;
            formatSelect.disabled = true;
            card.style.opacity = '0.6';
          } else {
            selectorInput.disabled = false;
            formatSelect.disabled = false;
            card.style.opacity = '1';
          }
          saveSettings();
        });

        // Format Select handler
        formatSelect.addEventListener('change', () => {
          item.urlFormat = formatSelect.value;
          saveSettings();
        });

        // Track selector changes to enable Save button
        selectorInput.addEventListener('input', () => {
          saveBtn.disabled = selectorInput.value.trim() === (item.selector || '');
        });

        // Save button handler
        saveBtn.addEventListener('click', () => {
          item.selector = selectorInput.value.trim();
          saveBtn.disabled = true;
          saveSettings();
        });

        // Also save on Enter press inside selector input
        selectorInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            item.selector = selectorInput.value.trim();
            saveBtn.disabled = true;
            saveSettings();
            selectorInput.blur();
          }
        });

        // Delete button handler
        deleteBtn.addEventListener('click', () => {
          whitelist = whitelist.filter(w => w.id !== item.id);
          saveSettings();
          initActiveTab(); // Refresh current tab status
        });

        whitelistItemsList.appendChild(clone);
      });
    }

    // Refresh active tab quick whitelister button status
    if (currentTabDomain) {
      const isWhitelisted = whitelist.some(item => matchHost(currentTabDomain, item.domainPattern));
      if (isWhitelisted) {
        btnQuickWhitelist.textContent = 'Remove Site';
        btnQuickWhitelist.classList.remove('btn-primary');
        btnQuickWhitelist.classList.add('btn-danger');
      } else {
        btnQuickWhitelist.textContent = 'Whitelist Site';
        btnQuickWhitelist.classList.remove('btn-danger');
        btnQuickWhitelist.classList.add('btn-primary');
      }
    }
  }

  // 5. Quick Whitelist Button Click
  btnQuickWhitelist.addEventListener('click', () => {
    if (!currentTabDomain) return;

    const matchedIndex = whitelist.findIndex(item => matchHost(currentTabDomain, item.domainPattern));
    
    if (matchedIndex > -1) {
      // Remove it
      whitelist.splice(matchedIndex, 1);
    } else {
      // Add it
      whitelist.push({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        domainPattern: currentTabDomain,
        selector: '',
        isEnabled: true
      });
    }
    saveSettings();
  });

  // 6. Form Expand / Collapse
  toggleAddForm.addEventListener('click', () => {
    const isActive = toggleAddForm.classList.toggle('active');
    if (isActive) {
      addSiteForm.classList.remove('hidden');
    } else {
      addSiteForm.classList.add('hidden');
    }
  });

  // 7. Add Custom Site Form Submit
  addSiteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    formError.classList.add('hidden');

    let domain = inputDomain.value.trim().toLowerCase();
    const selector = inputSelector.value.trim();

    // Clean up domain (remove https:// or http:// if user typed it)
    if (domain.includes('://')) {
      try {
        domain = new URL(domain).hostname;
      } catch (err) {
        // Fallback
        domain = domain.split('://')[1];
      }
    }
    // Remove slash or paths
    domain = domain.split('/')[0];

    // Simple validation
    if (!domain || domain.length < 3 || !domain.includes('.')) {
      showError('Please enter a valid domain (e.g. website.com).');
      return;
    }

    // Check duplicates
    if (whitelist.some(item => item.domainPattern === domain)) {
      showError('This domain is already in the whitelist.');
      return;
    }

    // Add to whitelist
    whitelist.push({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      domainPattern: domain,
      selector: selector,
      isEnabled: true
    });

    saveSettings(() => {
      // Reset form
      inputDomain.value = '';
      inputSelector.value = '';
      addSiteForm.classList.add('hidden');
      toggleAddForm.classList.remove('active');
    });
  });

  function showError(msg) {
    formError.textContent = msg;
    formError.classList.remove('hidden');
  }

  // 8. Fetch shortcut keys from Chrome Commands API
  function loadShortcutKey() {
    if (chrome.commands) {
      chrome.commands.getAll((commands) => {
        const toggleCmd = commands.find(cmd => cmd.name === 'toggle-links-local');
        if (toggleCmd && toggleCmd.shortcut) {
          shortcutKeyEl.textContent = toggleCmd.shortcut;
        }
      });
    }
  }

  // 9. Listen for changes on the global hostname setting
  if (chkGlobalHostname) {
    chkGlobalHostname.addEventListener('change', () => {
      showJustHostnameGlobal = chkGlobalHostname.checked;
      saveSettings();
    });
  }

  // Init
  loadSettings(() => {
    initActiveTab();
    updateUI();
    loadShortcutKey();
  });
});
