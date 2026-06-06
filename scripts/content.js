// Content Script for Inline Link Displayer

(function() {
  let whitelist = [];
  let activeItem = null;
  let observer = null;
  let debounceTimeout = null;
  let isToggledHidden = false;
  let showJustHostnameGlobal = false;

  // 1. Helper function to check if domain matches whitelist pattern (e.g. subdomains)
  function isDomainMatched(currentHost, pattern) {
    const host = currentHost.toLowerCase().trim();
    const pat = pattern.toLowerCase().trim();
    return host === pat || host.endsWith('.' + pat);
  }

  // 2. Clean URL formatting for aesthetic display
  function formatUrlForDisplay(href, formatMode, showJustHostnameGlobal) {
    if (!href) return '';
    // Skip anchor-only or action URLs
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return '';
    }

    try {
      const url = new URL(href, window.location.href);

      let showHostnameOnly = showJustHostnameGlobal;
      if (formatMode === 'hostname') {
        showHostnameOnly = true;
      } else if (formatMode === 'full') {
        showHostnameOnly = false;
      }

      if (showHostnameOnly) {
        return url.hostname;
      }

      let display = url.href.replace(/^(https?:\/\/)/, '');
      
      // Strip trailing slash if it's just the hostname path
      if (display.endsWith('/') && url.pathname === '/') {
        display = display.slice(0, -1);
      }
      return display;
    } catch (e) {
      return href; // Fallback
    }
  }

  // 3. Remove all existing badges from DOM (cleanup)
  function removeBadges() {
    const badges = document.querySelectorAll('.chrome-inline-url-badge');
    badges.forEach(b => b.remove());

    const processedAnchors = document.querySelectorAll('a[data-inline-url-processed]');
    processedAnchors.forEach(a => {
      a.removeAttribute('data-inline-url-processed');
    });
  }

  // 4. Find all links matching whitelisted selector
  function findTargetAnchors(selector) {
    const anchors = new Set();
    
    if (!selector) {
      // Default: match all anchors in the body
      document.querySelectorAll('a').forEach(a => anchors.add(a));
      return Array.from(anchors);
    }

    // Split comma-separated selector rules
    const parts = selector.split(',').map(p => p.trim()).filter(p => p.length > 0);
    parts.forEach(part => {
      try {
        const elements = document.querySelectorAll(part);
        elements.forEach(el => {
          if (el.tagName === 'A') {
            anchors.add(el);
          } else {
            el.querySelectorAll('a').forEach(a => anchors.add(a));
          }
        });
      } catch (e) {
        // Log query errors for invalid CSS selectors typed by the user
        console.warn('Inline URL Displayer - Invalid selector:', part);
      }
    });

    return Array.from(anchors);
  }

  // 5. Create and inject badge next to anchor
  function injectBadge(anchor) {
    // Double check it's not already processed
    if (anchor.getAttribute('data-inline-url-processed')) return;
    
    // Mark as processed
    anchor.setAttribute('data-inline-url-processed', 'true');

    // Skip empty text links (e.g. image buttons, icons)
    const text = anchor.textContent.trim();
    if (!text) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    const displayUrl = formatUrlForDisplay(href, activeItem.urlFormat || 'default', showJustHostnameGlobal);
    if (!displayUrl) return;

    // Create badge
    const badge = document.createElement('span');
    badge.className = 'chrome-inline-url-badge';
    badge.title = href; // Show absolute full URL on system hover tooltip
    
    // Attempt to retrieve and inject favicon
    try {
      const parsedUrl = new URL(href, window.location.href);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        const faviconImg = document.createElement('img');
        faviconImg.className = 'chrome-inline-url-favicon';
        
        // Construct the Chrome extension favicon URL
        const faviconUrl = new URL(chrome.runtime.getURL('/_favicon/'));
        faviconUrl.searchParams.append('pageUrl', parsedUrl.origin);
        faviconUrl.searchParams.append('size', '16');
        
        faviconImg.src = faviconUrl.toString();
        faviconImg.alt = '';
        badge.appendChild(faviconImg);
      }
    } catch (e) {
      // Ignore URL parsing errors for relative/invalid links
    }

    // Append the display text inside parentheses
    const textNode = document.createTextNode(`(${displayUrl})`);
    badge.appendChild(textNode);
    
    // Prevent clicking the badge from acting as the link if desired
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    // Insert immediately after the anchor
    anchor.after(badge);
  }

  // 6. Process the DOM and inject badges
  function processLinks() {
    if (!activeItem || !activeItem.isEnabled) return;

    const anchors = findTargetAnchors(activeItem.selector);
    anchors.forEach(anchor => {
      injectBadge(anchor);
    });
  }

  // 7. Debounce wrapper for performance on high-frequency changes
  function triggerScan() {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(processLinks, 100);
  }

  // 8. Start observing DOM mutations (for infinite scroll / single-page-apps)
  function startObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // Check if any added node is an anchor or contains elements
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'A' || node.querySelector('a') || (activeItem.selector && node.querySelector(activeItem.selector))) {
                shouldScan = true;
                break;
              }
            }
          }
        }
        if (shouldScan) break;
      }

      if (shouldScan) {
        triggerScan();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // 9. Load config and apply logic
  function loadAndApply() {
    chrome.storage.local.get({ whitelist: [], showJustHostnameGlobal: false }, (data) => {
      whitelist = data.whitelist;
      showJustHostnameGlobal = data.showJustHostnameGlobal;
      const currentHost = window.location.hostname;

      // Find if current site is whitelisted and active
      activeItem = whitelist.find(item => item.isEnabled && isDomainMatched(currentHost, item.domainPattern));

      if (activeItem) {
        // Ensure state is updated (in case selector changed)
        removeBadges();
        
        // Initial run
        processLinks();
        
        // Start watching for future elements
        startObserver();
      } else {
        // If it was whitelisted but got removed/disabled, clean up
        removeBadges();
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }
    });
  }

  // 10. Listen for messages from background command shortcut
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggle-links-local') {
      isToggledHidden = !isToggledHidden;
      if (isToggledHidden) {
        document.body.classList.add('chrome-inline-urls-hidden');
      } else {
        document.body.classList.remove('chrome-inline-urls-hidden');
      }
      sendResponse({ status: 'toggled', hidden: isToggledHidden });
    }
  });

  // 11. Listen for storage changes to instantly update DOM
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.whitelist || changes.showJustHostnameGlobal !== undefined)) {
      loadAndApply();
    }
  });

  // Run on load
  // Wait if DOM is not ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndApply);
  } else {
    loadAndApply();
  }

})();
