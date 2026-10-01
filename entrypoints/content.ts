import { defineContentScript } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import { getSettings, onSettingsChanged, type UserSettings } from '../utils/storage';
import {
  isKhataAcademyPage,
  scanAndApplyKhataAcademy,
  removeKhataAcademyBadges,
} from '../modules/khataAcademy';
import {
  initVolumeLimiter,
  updateVolumeLimiter,
  applyVolumeLimitToAll,
} from '../modules/volumeLimiter';

export default defineContentScript({
  matches: [
    '*://*.khataacademy.com/*',
    '*://khataacademy.com/*',
    '<all_urls>',
  ],
  allFrames: true,
  runAt: 'document_idle',
  main(ctx) {
    let currentSettings: UserSettings;
    let observer: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const debouncedScan = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!currentSettings) return;

        if (isKhataAcademyPage()) {
          scanAndApplyKhataAcademy(currentSettings);
        }
      }, 150);
    };

    // Initialize
    getSettings().then(settings => {
      currentSettings = settings;

      // 1. Initialize per-site volume limiter (runs on all matched domains)
      initVolumeLimiter(currentSettings);

      // 2. Initialize Khata Academy features if on Khata
      if (isKhataAcademyPage()) {
        scanAndApplyKhataAcademy(currentSettings);

        // Observe DOM for dynamic lesson loads, Canva embeds, or completion updates
        observer = new MutationObserver(mutations => {
          // Avoid re-triggering observer on our own injected mutations
          const isOurMutation = mutations.every(m => {
            const target = m.target as HTMLElement;
            return (
              target?.classList?.contains('itch-khata-badge') ||
              target?.classList?.contains('itch-khata-subtitle-badge') ||
              target?.classList?.contains('itch-canva-embed-btn') ||
              target?.closest?.('.itch-canva-embed-btn') !== null
            );
          });

          if (!isOurMutation) {
            debouncedScan();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'src', 'data-passed'],
        });
      }
    });

    // Handle real-time settings toggles from popup
    const unsubscribe = onSettingsChanged(newSettings => {
      currentSettings = newSettings;

      // Update volume limiter in real time
      updateVolumeLimiter(newSettings);

      // Update Khata Academy badges in real time
      if (isKhataAcademyPage()) {
        if (newSettings.modules.khataAcademy) {
          scanAndApplyKhataAcademy(newSettings);
        } else {
          removeKhataAcademyBadges();
        }
      }
    });

    // Listen for manual commands from popup
    if (browser?.runtime?.onMessage) {
      browser.runtime.onMessage.addListener((message: any) => {
        if (message?.action === 'rescan') {
          if (currentSettings && isKhataAcademyPage()) {
            scanAndApplyKhataAcademy(currentSettings);
            const count = document.querySelectorAll('.js-accordion-parent').length;
            const canvaCount = document.querySelectorAll('iframe[src*="canva.com"]').length;
            return Promise.resolve({ success: true, count, canvaCount });
          } else {
            return Promise.resolve({ success: false, reason: 'Not on Khata Academy or disabled' });
          }
        }

        if (message?.action === 'applyVolumeNow' && typeof message.limit === 'number') {
          applyVolumeLimitToAll(message.limit);
          return Promise.resolve({ success: true, count: document.querySelectorAll('video, audio').length });
        }
      });
    }

    // Cleanup on content script unload (if supported)
    if (ctx && typeof ctx.onInvalidated === 'function') {
      ctx.onInvalidated(() => {
        observer?.disconnect();
        unsubscribe();
        if (debounceTimer) clearTimeout(debounceTimer);
      });
    }
  },
});
