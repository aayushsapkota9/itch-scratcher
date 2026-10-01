import { browser } from 'wxt/browser';

export interface UserSettings {
  modules: {
    khataAcademy: boolean;
    volumeLimiter: boolean;
    [key: string]: boolean;
  };
  options: {
    showPercentage: boolean;
    highlightCompleted: boolean;
    openCanvaButton: boolean;
  };
  volumeLimits: {
    [domain: string]: number; // 0 to 100
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  modules: {
    khataAcademy: true,
    volumeLimiter: true,
  },
  options: {
    showPercentage: true,
    highlightCompleted: true,
    openCanvaButton: true,
  },
  volumeLimits: {
    'facebook.com': 30,
  },
};

const STORAGE_KEY = 'itch_scratcher_settings';

export async function getSettings(): Promise<UserSettings> {
  try {
    if (browser?.storage?.sync) {
      const res = await browser.storage.sync.get(STORAGE_KEY);
      if (res && res[STORAGE_KEY]) {
        const stored = res[STORAGE_KEY] as Partial<UserSettings>;
        return {
          ...DEFAULT_SETTINGS,
          ...stored,
          modules: {
            ...DEFAULT_SETTINGS.modules,
            ...(stored.modules || {}),
          },
          options: {
            ...DEFAULT_SETTINGS.options,
            ...(stored.options || {}),
          },
          volumeLimits: {
            ...DEFAULT_SETTINGS.volumeLimits,
            ...(stored.volumeLimits || {}),
          },
        };
      }
    }
  } catch (err) {
    console.warn('[ItchScratcher] Failed to load settings, using defaults:', err);
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    if (browser?.storage?.sync) {
      await browser.storage.sync.set({ [STORAGE_KEY]: settings });
    }
  } catch (err) {
    console.error('[ItchScratcher] Failed to save settings:', err);
  }
}

export function onSettingsChanged(callback: (settings: UserSettings) => void): () => void {
  if (!browser?.storage?.onChanged) {
    return () => {};
  }

  const listener = (changes: Record<string, { oldValue?: any; newValue?: any }>, areaName: string) => {
    if (areaName === 'sync' && changes[STORAGE_KEY]) {
      const newVal = changes[STORAGE_KEY].newValue as UserSettings;
      if (newVal) {
        callback({
          ...DEFAULT_SETTINGS,
          ...newVal,
          modules: {
            ...DEFAULT_SETTINGS.modules,
            ...(newVal.modules || {}),
          },
          options: {
            ...DEFAULT_SETTINGS.options,
            ...(newVal.options || {}),
          },
          volumeLimits: {
            ...DEFAULT_SETTINGS.volumeLimits,
            ...(newVal.volumeLimits || {}),
          },
        });
      }
    }
  };

  browser.storage.onChanged.addListener(listener);
  return () => {
    browser.storage.onChanged.removeListener(listener);
  };
}
