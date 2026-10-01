import React, { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  getSettings,
  saveSettings,
  type UserSettings,
  DEFAULT_SETTINGS,
} from '../../utils/storage';
import { extractDomain, isDomainMatch } from '../../modules/volumeLimiter';
import { RefreshCw, Plus, X, Volume2, GraduationCap } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [activeApp, setActiveApp] = useState<'volume' | 'khata'>('volume');
  const [isKhataPage, setIsKhataPage] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [rescanStatus, setRescanStatus] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(loaded => {
      setSettings(loaded);
      setLoading(false);
    });

    if (browser?.tabs?.query) {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          setActiveTabId(activeTab.id);
        }
        if (activeTab?.url) {
          const isKhata =
            activeTab.url.includes('khataacademy') ||
            activeTab.url.includes('khata');
          setIsKhataPage(isKhata);

          // Automatically default to Khata tab if active tab is Khata Academy
          if (isKhata) {
            setActiveApp('khata');
          } else {
            setActiveApp('volume');
          }

          // Extract domain if it is a regular http/https page
          if (activeTab.url.startsWith('http')) {
            const domain = extractDomain(activeTab.url);
            setCurrentDomain(domain);
          }
        }
      }).catch(err => {
        console.warn('Could not query tabs:', err);
      });
    }
  }, []);

  const toggleModule = async (moduleId: string) => {
    const updated: UserSettings = {
      ...settings,
      modules: {
        ...settings.modules,
        [moduleId]: !settings.modules[moduleId],
      },
    };
    setSettings(updated);
    await saveSettings(updated);
  };

  const toggleOption = async (optionKey: keyof UserSettings['options']) => {
    const updated: UserSettings = {
      ...settings,
      options: {
        ...settings.options,
        [optionKey]: !settings.options[optionKey],
      },
    };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleVolumeChange = async (domain: string, newLimit: number) => {
    const updated: UserSettings = {
      ...settings,
      volumeLimits: {
        ...settings.volumeLimits,
        [domain]: newLimit,
      },
    };
    setSettings(updated);
    await saveSettings(updated);

    if (activeTabId && (currentDomain === domain || isDomainMatch(currentDomain, domain))) {
      if (browser?.runtime?.sendMessage) {
        browser.runtime.sendMessage({
          action: 'setTabVolume',
          tabId: activeTabId,
          limit: newLimit,
        }).catch(() => {});
      }
      if (browser?.tabs?.sendMessage) {
        browser.tabs.sendMessage(activeTabId, {
          action: 'applyVolumeNow',
          limit: newLimit,
        }).catch(() => {});
      }
    }
  };

  const addCurrentSite = async (domain: string) => {
    if (!domain) return;
    const defaultLimit = 30; // 30% default volume limit
    const updated: UserSettings = {
      ...settings,
      volumeLimits: {
        [domain]: defaultLimit,
        ...settings.volumeLimits,
      },
    };
    setSettings(updated);
    await saveSettings(updated);

    if (activeTabId) {
      if (browser?.runtime?.sendMessage) {
        browser.runtime.sendMessage({
          action: 'setTabVolume',
          tabId: activeTabId,
          limit: defaultLimit,
        }).catch(() => {});
      }
      if (browser?.tabs?.sendMessage) {
        browser.tabs.sendMessage(activeTabId, {
          action: 'applyVolumeNow',
          limit: defaultLimit,
        }).catch(() => {});
      }
    }
  };

  const removeSite = async (domain: string) => {
    const nextLimits = { ...settings.volumeLimits };
    delete nextLimits[domain];
    const updated: UserSettings = {
      ...settings,
      volumeLimits: nextLimits,
    };
    setSettings(updated);
    await saveSettings(updated);

    if (activeTabId && (currentDomain === domain || isDomainMatch(currentDomain, domain))) {
      if (browser?.runtime?.sendMessage) {
        browser.runtime.sendMessage({
          action: 'setTabVolume',
          tabId: activeTabId,
          limit: 100,
        }).catch(() => {});
      }
      if (browser?.tabs?.sendMessage) {
        browser.tabs.sendMessage(activeTabId, {
          action: 'applyVolumeNow',
          limit: 100,
        }).catch(() => {});
      }
    }
  };

  const handleRescan = async () => {
    if (browser?.tabs?.query) {
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (activeTab?.id) {
          setRescanStatus('syncing');
          const response = (await browser.tabs.sendMessage(activeTab.id, {
            action: 'rescan',
          })) as { success?: boolean; count?: number; canvaCount?: number } | undefined;
          
          if (response?.success) {
            setRescanStatus('synced');
          } else {
            setRescanStatus('done');
          }
          setTimeout(() => setRescanStatus(null), 1800);
        }
      } catch (err) {
        setRescanStatus('refresh');
        setTimeout(() => setRescanStatus(null), 1800);
      }
    }
  };

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  const isKhataEnabled = settings.modules.khataAcademy;
  const isVolumeEnabled = settings.modules.volumeLimiter;

  return (
    <div className="popup-container">
      {/* APP SEGMENTED CONTROLLER (SEGREGATES THE TWO FUNCTIONALITIES) */}
      <div className="app-switcher-bar">
        <button
          type="button"
          className={`app-tab ${activeApp === 'volume' ? 'active' : ''}`}
          onClick={() => setActiveApp('volume')}
        >
          <Volume2 size={13} />
          <span>Volume Limiter</span>
        </button>
        <button
          type="button"
          className={`app-tab ${activeApp === 'khata' ? 'active' : ''}`}
          onClick={() => setActiveApp('khata')}
        >
          <GraduationCap size={13} />
          <span>Khata Academy</span>
          {isKhataPage && <span className="tab-live-dot" title="Active on this tab" />}
        </button>
      </div>

      {/* DEDICATED APP VIEW 1: VOLUME LIMITER */}
      {activeApp === 'volume' && (
        <main className="app-view">
          <div className="view-header">
            <div>
              <div className="view-title">Volume Ceiling</div>
              <div className="view-subtitle">Limit auto-max blasting per site</div>
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={isVolumeEnabled}
                onChange={() => toggleModule('volumeLimiter')}
              />
              <span className="slider" />
            </label>
          </div>

          {isVolumeEnabled ? (
            <div className="view-body">
              {/* Add Current Site Button */}
              {currentDomain && !Object.keys(settings.volumeLimits).some((d) => isDomainMatch(currentDomain, d)) && (
                <button
                  type="button"
                  className="add-site-btn"
                  onClick={() => addCurrentSite(currentDomain)}
                >
                  <Plus size={12} />
                  <span>Add current site ({currentDomain})</span>
                </button>
              )}

              {/* Sliders for Sites [slider, site] */}
              <div className="volume-list">
                {Object.keys(settings.volumeLimits).length === 0 ? (
                  <div className="empty-hint">
                    No sites added yet. Open a loud site like Facebook or TikTok and click "Add current site".
                  </div>
                ) : (
                  Object.entries(settings.volumeLimits).map(([domain, limit]) => {
                    const isCurrent = domain === currentDomain || isDomainMatch(domain, currentDomain);
                    return (
                      <div key={domain} className={`volume-card ${isCurrent ? 'is-current' : ''}`}>
                        <div className="volume-card-top">
                          <div className="volume-site-info">
                            <span className="site-name">{domain}</span>
                            {isCurrent && <span className="current-badge">this tab</span>}
                          </div>

                          <div className="volume-actions">
                            <span className="limit-val">{limit}% max</span>
                            <button
                              type="button"
                              className="remove-site-btn"
                              title={`Remove ${domain}`}
                              onClick={() => removeSite(domain)}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Slider */}
                        <div className="slider-wrapper">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={limit}
                            onChange={(e) => handleVolumeChange(domain, Number(e.target.value))}
                            className="volume-range-input"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="disabled-notice">
              Volume limiter is turned off. Toggle the switch above to enable site volume ceilings.
            </div>
          )}
        </main>
      )}

      {/* DEDICATED APP VIEW 2: KHATA ACADEMY */}
      {activeApp === 'khata' && (
        <main className="app-view">
          <div className="view-header">
            <div>
              <div className="view-title">Khata Academy</div>
              <div className="view-subtitle">Course progress &amp; Canva tools</div>
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={isKhataEnabled}
                onChange={() => toggleModule('khataAcademy')}
              />
              <span className="slider" />
            </label>
          </div>

          {isKhataEnabled ? (
            <div className="view-body">
              {/* Tab Status Banner & Rescan */}
              <div className="khata-status-row">
                <div className="khata-indicator">
                  <span className={`status-dot ${isKhataPage ? 'online' : 'offline'}`} />
                  <span className="khata-status-text">
                    {isKhataPage ? 'Detected on active tab' : 'Not on khataacademy.com'}
                  </span>
                </div>

                {isKhataPage && (
                  <button
                    onClick={handleRescan}
                    className={`rescan-btn ${rescanStatus === 'synced' ? 'success' : ''}`}
                    title="Re-scan page elements"
                  >
                    <RefreshCw size={10} className={rescanStatus === 'syncing' ? 'spin' : ''} />
                    <span>
                      {rescanStatus === 'synced'
                        ? 'Synced'
                        : rescanStatus === 'refresh'
                        ? 'Reload'
                        : 'Re-scan'}
                    </span>
                  </button>
                )}
              </div>

              {/* Sub-options */}
              <div className="options-list">
                <label className="option-row">
                  <span className="option-label">Open Canva button on slides</span>
                  <input
                    type="checkbox"
                    checked={settings.options.openCanvaButton}
                    onChange={() => toggleOption('openCanvaButton')}
                  />
                </label>

                <label className="option-row">
                  <span className="option-label">Show completion percentage (e.g. 67%)</span>
                  <input
                    type="checkbox"
                    checked={settings.options.showPercentage}
                    onChange={() => toggleOption('showPercentage')}
                  />
                </label>

                <label className="option-row">
                  <span className="option-label">Highlight finished chapters in green</span>
                  <input
                    type="checkbox"
                    checked={settings.options.highlightCompleted}
                    onChange={() => toggleOption('highlightCompleted')}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="disabled-notice">
              Khata Academy features are disabled. Toggle the switch above to enable them.
            </div>
          )}
        </main>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <span className="footer-brand">ItchScratcher</span>
        <span className="footer-ver">v1.2</span>
      </footer>
    </div>
  );
}
