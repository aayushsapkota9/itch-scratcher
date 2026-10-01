# ItchScratcher 🚀

A modular Chrome extension built with [WXT](https://wxt.dev/) and **React** designed to fix annoying web interface quirks—starting with **Khata Academy**.

---

## Features

### 🎓 1. Khata Academy Progress Badges
- **No More Guesswork**: Automatically inspects every chapter accordion (`.js-accordion-parent`) on Khata Academy course pages.
- **Header Badges**: Adds a completion badge directly on the chapter header (e.g. `2/3 Done (67%)` or `✓ All Done`) so you don't need to manually expand each chapter to check what's completed.
- **Real-Time Reactive**: Uses `MutationObserver` to instantly recalculate when lessons are completed or loaded dynamically.
- **Subtitle Summary**: Enriches the existing part counter (e.g. `3 Parts • 2/3 done`).
- **Fully Toggleable**: Enable or disable the Khata Academy module from the React popup without touching any code.

### 🎨 2. Canva Presentation Embed Opener
- **Automated Detection**: Detects any embedded Canva slide presentations (`iframe[src*="canva.com"]`) in the active lesson.
- **Clean `/view` Links**: Automatically strips the `?embed` parameter (e.g., converts `.../view?embed` to `.../view`), so clicking it opens full-screen Canva slides in a clean new tab.
- **Top Overlay Button**: Attaches a clean, minimalist "Open in Canva ↗" button directly on the top-right corner of the slide embed container.

### 🔊 3. Per-Site Volume Ceiling (Auto-Max Volume Limiter)
- **Universal Volume Cap**: Set an upper volume limit for any website (e.g., 20% or 30% for Facebook) so your ears aren't blasted when your physical speakers are turned up high for YouTube.
- **One Slider Per Site `[slider, site]`**: Drag a clean slider from 0% to 100% to set the ceiling for that domain.
- **"Add current site" Button**: When on any website (e.g., Facebook, TikTok, Instagram, Reddit), open the popup and click **`+ Add current site`** to immediately cap that domain.
- **Automatic Enforcement**: Catches video/audio `play`, `volumechange`, and dynamically loaded videos via `MutationObserver` and clamps volume back to your limit in real time.

### 🧩 4. Modular Architecture
- Built with a clean module architecture so you can toggle modules and add new site tweaks.
- Settings are synchronized via `chrome.storage.sync`.
- Changes in the popup take effect immediately in active tabs without requiring a page reload.

---

## 🛠️ How to Install on Google Chrome

Follow these quick steps to load the extension into Google Chrome:

1. **Build the extension** (already built in `dist/chrome-mv3`):
   ```bash
   pnpm build
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **"Load unpacked"** button in the top-left corner.
5. In the file picker, select the following folder from this project:
   ```text
   /Users/aayushsapkota9/repos/self/my-extension/dist/chrome-mv3
   ```
6. The extension **"ItchScratcher - Khata Academy Progress & Web Tweaks"** will now appear in your extensions list and the Chrome toolbar!
7. *(Optional)* Pin the extension icon in Chrome's toolbar for quick access to settings and toggles.

---

## 🧪 Testing Locally

A demo page matching Khata Academy's exact DOM structure is provided at `demo.html`:
1. Open `demo.html` in Chrome:
   - Either double-click `demo.html` or drag it into Chrome.
   - *Note: To run content scripts on local `file:///` URLs, go to `chrome://extensions` > click **Details** on ItchScratcher > enable **"Allow access to file URLs"**.*
2. You will see:
   - **Chapter 02. Business Fundamentals** shows **`2/3 Done (67%)`**
   - **Chapter 08. Getting Started** shows **`0/1 Done (0%)`**
3. Open the extension popup from the toolbar to toggle the module on/off or change options.

---

## 🚀 Adding New Sites / Modules

To add a new site scratcher:
1. Create a new module inside `modules/<siteName>.ts`:
   ```ts
   export function scanAndApplyMySite(settings: UserSettings) { ... }
   ```
2. Add your toggle to `utils/storage.ts`:
   ```ts
   modules: {
     khataAcademy: boolean;
     myNewSite: boolean;
   }
   ```
3. Register the trigger in `entrypoints/content.ts` and `entrypoints/popup/App.tsx`.
4. Run `pnpm build`.
# itch-scratcher
