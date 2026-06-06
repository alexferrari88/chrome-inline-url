# Inline Link Displayer Chrome Extension

A highly polished, privacy-friendly Chrome Extension (Manifest V3) that displays the full destination URL of links inline on whitelisted websites. This is designed to let you see where links are pointing to at a glance without having to hover over them, while keeping visual clutter minimal.

## Features

- 🌐 **Whitelisted Sites Only**: Only runs on websites you explicitly whitelist.
- 🎯 **Targeted Element Selectors**: Specify a CSS selector (e.g. `div.article_content`) for each site to only show inline URLs inside those elements, avoiding header/navigation clutter.
- ⌨️ **Keyboard Shortcut Toggle**: Instantly toggle URL visibility on the active tab by pressing `Alt+Shift+U` (customizable).
- 📋 **Zero Copy-Paste Pollution**: URL badges are styled with `user-select: none`, meaning you can select and copy webpage text normally without accidentally copying the inline URLs.
- 💎 **Premium Popup UI**: A sleek, dark glassmorphic management interface for quick whitelisting, selector updating, and settings management.
- ⚡ **Dynamic DOM Support**: Monitors infinite scrolls, single-page navigation, and dynamically loaded elements via a debounced `MutationObserver`.

## Installation (Developer Mode)

Since this extension is in active development, you can load it as an unpacked extension in Chrome:

1. Download or clone this repository to your computer.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the project directory (the folder containing `manifest.json`).

## Usage

1. **Quick Whitelisting**: Click the extension icon in your toolbar when browsing a page, then click the **Whitelist Site** button.
2. **Restrict to Selectors**: In the whitelist management list in the popup, type a CSS selector (e.g., `.article-body`, `div.main-content`) next to the site domain and press `Enter` or click the save icon.
3. **Keyboard Toggle**: Press `Alt+Shift+U` to hide or show inline URLs on the active page.

## Testing Locally

We have included a built-in test page **`test_page.html`** in this repository. 
Open or drag `test_page.html` in Chrome after installing the extension to test its capabilities, including:
- Selector targeting.
- Dynamic page content (infinite scroll simulation).
- Keyboard shortcuts.
- Text selection and copy-paste.

## Tech Stack

- **Extension Schema**: Manifest V3
- **Background Orchestrator**: Service Worker (`background.js`)
- **Storage**: Chrome Storage Local API
- **Styling**: Vanilla CSS (Popup and injected badge elements)
- **Icons**: Handcrafted vector SVG compiled into compliant multi-size PNGs.

---
Created by [Alex Ferrari](https://github.com/alexferrari88).
