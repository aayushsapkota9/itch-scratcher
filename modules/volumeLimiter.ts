import type { UserSettings } from '../utils/storage';

let activeLimit: number | null = null;
let isInitialized = false;
let mediaObserver: MutationObserver | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Extracts a normalized domain from a URL or hostname
 * e.g. "https://www.facebook.com/watch" -> "facebook.com"
 * e.g. "www.youtube.com" -> "youtube.com"
 */
export function extractDomain(urlOrHost: string): string {
  if (!urlOrHost) return '';
  try {
    const host = urlOrHost.includes('://') ? new URL(urlOrHost).hostname : urlOrHost;
    return host.replace(/^www\./, '').toLowerCase().trim();
  } catch {
    return urlOrHost.replace(/^www\./, '').toLowerCase().trim();
  }
}

/**
 * Checks if two domains match (supporting subdomains, e.g. web.facebook.com matches facebook.com)
 */
export function isDomainMatch(domainA: string, domainB: string): boolean {
  const normA = extractDomain(domainA);
  const normB = extractDomain(domainB);
  if (!normA || !normB) return false;
  return normA === normB || normA.endsWith('.' + normB) || normB.endsWith('.' + normA);
}

/**
 * Checks if the current page hostname matches any configured volume limit domain
 */
export function getDomainLimit(hostname: string, volumeLimits: Record<string, number>): number | null {
  const normalizedCurrent = extractDomain(hostname);
  if (!normalizedCurrent) return null;

  // Exact match first
  if (typeof volumeLimits[normalizedCurrent] === 'number') {
    return volumeLimits[normalizedCurrent];
  }

  // Suffix/subdomain match (e.g. m.facebook.com or web.facebook.com matching facebook.com)
  for (const [domain, limit] of Object.entries(volumeLimits)) {
    const normDomain = extractDomain(domain);
    if (normalizedCurrent === normDomain || normalizedCurrent.endsWith('.' + normDomain)) {
      return limit;
    }
  }

  return null;
}

/**
 * Clamps media element volume to the maximum ratio (0.0 to 1.0).
 * Handles muting when 0%, unmuting when >0%, and clamping volume down or scaling back up when ceiling changes.
 */
export function clampMediaVolume(media: HTMLMediaElement, maxRatio: number): void {
  try {
    if (maxRatio <= 0) {
      // 0% Limit: Force mute and 0 volume
      if (!media.muted) {
        media.muted = true;
        media.dataset.itchAutoMuted = 'true';
      }
      if (media.volume !== 0) {
        media.volume = 0;
      }
    } else {
      // >0% Limit: Ensure element is not falsely muted by our previous 0% clamp
      if (media.dataset.itchAutoMuted === 'true') {
        media.muted = false;
        delete media.dataset.itchAutoMuted;
      }

      // If current volume exceeds the ceiling, clamp it
      if (media.volume > maxRatio + 0.005) {
        media.dataset.itchClamped = 'true';
        media.dataset.itchLastLimit = String(maxRatio);
        media.volume = maxRatio;
      } else if (media.dataset.itchClamped === 'true') {
        // If the ceiling was raised by the user (e.g. from 30% to 60%), scale volume up accordingly
        const lastLimit = parseFloat(media.dataset.itchLastLimit || '0');
        if (maxRatio > lastLimit && Math.abs(media.volume - lastLimit) < 0.05) {
          media.volume = Math.min(1, maxRatio);
          media.dataset.itchLastLimit = String(maxRatio);
        }
        // If ceiling reached 100%, release our clamp tracking
        if (maxRatio >= 0.99) {
          media.volume = 1;
          delete media.dataset.itchClamped;
          delete media.dataset.itchLastLimit;
        }
      }
    }
  } catch (err) {
    // Gracefully handle cross-origin protected or detached media elements
  }
}

/**
 * Applies volume state to all media elements in the DOM
 */
export function applyVolumeLimitToAll(limitPercent: number): void {
  const maxRatio = Math.max(0, Math.min(100, limitPercent)) / 100;
  activeLimit = maxRatio;

  const medias = document.querySelectorAll<HTMLMediaElement>('video, audio');
  medias.forEach(media => clampMediaVolume(media, maxRatio));
}

/**
 * Event handlers for play, playing, canplay, loadedmetadata, volumechange, and timeupdate
 */
function handleMediaEvent(e: Event): void {
  if (activeLimit === null) return;
  const target = (e.composedPath && e.composedPath()[0]) || e.target;
  if (target instanceof HTMLMediaElement) {
    clampMediaVolume(target, activeLimit);
  }
}

/**
 * Initializes listeners and DOM observer for volume limiting
 */
export function initVolumeLimiter(settings: UserSettings): void {
  if (!settings.modules.volumeLimiter) {
    activeLimit = null;
    return;
  }

  const limit = getDomainLimit(window.location.hostname, settings.volumeLimits || {});

  if (limit === null) {
    activeLimit = null;
    return;
  }

  applyVolumeLimitToAll(limit);

  if (!isInitialized) {
    isInitialized = true;

    // Listen to media lifecycle events in capture phase so we run before page handlers
    window.addEventListener('volumechange', handleMediaEvent, true);
    window.addEventListener('play', handleMediaEvent, true);
    window.addEventListener('playing', handleMediaEvent, true);
    window.addEventListener('canplay', handleMediaEvent, true);
    window.addEventListener('loadedmetadata', handleMediaEvent, true);
    window.addEventListener('timeupdate', handleMediaEvent, true);

    // Watch for dynamically inserted video/audio elements (e.g. infinite scroll / Reels / stories)
    mediaObserver = new MutationObserver(() => {
      if (activeLimit !== null) {
        const medias = document.querySelectorAll<HTMLMediaElement>('video, audio');
        medias.forEach(media => clampMediaVolume(media, activeLimit!));
      }
    });

    mediaObserver.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });

    // Light heartbeat check every 600ms to guarantee no media escapes the ceiling
    if (!heartbeatInterval) {
      heartbeatInterval = setInterval(() => {
        if (activeLimit !== null) {
          const medias = document.querySelectorAll<HTMLMediaElement>('video, audio');
          medias.forEach(media => clampMediaVolume(media, activeLimit!));
        }
      }, 600);
    }
  }
}

/**
 * Updates or disables the volume limit on settings changes
 */
export function updateVolumeLimiter(settings: UserSettings): void {
  if (!settings.modules.volumeLimiter) {
    activeLimit = null;
    return;
  }

  const limit = getDomainLimit(window.location.hostname, settings.volumeLimits || {});
  if (limit !== null) {
    applyVolumeLimitToAll(limit);
  } else {
    // Setting removed: reset clamped media back to 100% volume
    if (activeLimit !== null) {
      applyVolumeLimitToAll(100);
    }
    activeLimit = null;
  }
}
