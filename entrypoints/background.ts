import { defineBackground } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import { getSettings } from '../utils/storage';
import { extractDomain, getDomainLimit } from '../modules/volumeLimiter';

export default defineBackground(() => {
  console.log('[ItchScratcher] Background service worker initialized');

  /**
   * Enforces volume ceiling on a tab:
   * 1. Native tab mute via browser.tabs.update (infallible for 0%)
   * 2. Direct message to content script to clamp HTML5 media elements
   */
  async function setTabAudioVolume(tabId: number, limitPercent: number): Promise<void> {
    // 1. NATIVE BROWSER TAB MUTE API
    if (limitPercent === 0) {
      try {
        await browser.tabs.update(tabId, { muted: true });
      } catch (err) {
        console.warn('[ItchScratcher] Failed to mute tab natively:', err);
      }
    } else {
      try {
        await browser.tabs.update(tabId, { muted: false });
      } catch (err) {
        // Tab might be closing
      }
    }

    // 2. FORWARD LIMIT DIRECTLY TO CONTENT SCRIPT
    try {
      await browser.tabs.sendMessage(tabId, {
        action: 'applyVolumeNow',
        limit: limitPercent,
      });
    } catch {
      // Content script may not be loaded yet or tab closed
    }
  }

  /**
   * Checks if an updated tab has a volume limit and applies it
   */
  async function checkAndApplyTabVolume(tabId: number, url?: string): Promise<void> {
    if (!url || !url.startsWith('http')) return;

    try {
      const settings = await getSettings();
      if (!settings.modules.volumeLimiter) return;

      const domain = extractDomain(url);
      const limit = getDomainLimit(domain, settings.volumeLimits || {});

      if (limit !== null) {
        await setTabAudioVolume(tabId, limit);
      }
    } catch (err) {
      console.warn('[ItchScratcher] checkAndApplyTabVolume error:', err);
    }
  }

  // Handle messages from popup
  browser.runtime.onMessage.addListener((message: any) => {
    if (message?.action === 'setTabVolume' && typeof message.tabId === 'number' && typeof message.limit === 'number') {
      return setTabAudioVolume(message.tabId, message.limit)
        .then(() => ({ success: true }))
        .catch((err) => ({ success: false, error: String(err) }));
    }
  });

  // Listen for tab navigation / reload to auto-apply limits
  browser.tabs.onUpdated.addListener((tabId: number, changeInfo: any, tab: any) => {
    if (changeInfo.status === 'complete' || changeInfo.url) {
      checkAndApplyTabVolume(tabId, tab.url);
    }
  });
});
