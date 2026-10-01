import type { UserSettings } from '../utils/storage';

const BADGE_CLASS = 'itch-khata-badge';
const SUBTITLE_BADGE_CLASS = 'itch-khata-subtitle-badge';
const CANVA_SIDEBAR_CARD_CLASS = 'itch-canva-sidebar-card';
const CANVA_EMBED_BTN_CLASS = 'itch-canva-embed-btn';

/**
 * Checks if a specific sidebar content item is completed.
 * Analyzes the gap-8 container (which holds the checkmark icon when completed)
 * and falls back to checkmark SVGs or status indicators.
 */
function isItemCompleted(item: Element): boolean {
  // 1. In Khata Academy, completed items contain an SVG inside .gap-8
  const gap = item.querySelector('.gap-8');
  if (gap && gap.querySelector('svg')) {
    return true;
  }

  // 2. Look for primary-colored check icon (svg.text-primary)
  const primarySvg = item.querySelector('svg.text-primary');
  if (primarySvg) {
    return true;
  }

  // 3. Look for SVG with checkmark path attribute
  const checkmarkPath = item.querySelector('svg path[d*="10.58"], svg path[d*="15.58"]');
  if (checkmarkPath) {
    return true;
  }

  // 4. Look for passed or completed CSS classes or attributes
  if (
    item.classList.contains('passed') ||
    item.classList.contains('completed') ||
    item.getAttribute('data-passed') === '1' ||
    item.getAttribute('data-passed') === 'true'
  ) {
    return true;
  }

  return false;
}

/**
 * Creates SVG icon for badges
 */
function createCheckSvg(color: string = 'currentColor'): string {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M20 6 9 17l-5-5"/></svg>`;
}

function createClockSvg(color: string = 'currentColor'): string {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
}

function createExternalLinkSvg(size: number = 13): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
}

/**
 * Cleans Canva embed URL to direct view URL without ?embed query
 * e.g. https://www.canva.com/design/DAFDXQc33Jg/view?embed -> https://www.canva.com/design/DAFDXQc33Jg/view
 */
export function cleanCanvaUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl, window.location.href);
    url.searchParams.delete('embed');
    let href = url.toString();
    if (href.endsWith('?')) {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return rawUrl.replace(/[?&]embed(=[^&#]*)?/, '').replace(/\?$/, '');
  }
}

/**
 * Injects or updates the progress badge in a single chapter accordion.
 */
function processAccordion(accordion: Element, settings: UserSettings): void {
  // Find title row
  const titleRow = accordion.querySelector('.accordion__title');
  if (!titleRow) return;

  // Find all content items belonging to this accordion (exclude nested accordions if any)
  const allItems = Array.from(accordion.querySelectorAll('.sidebar-content-item, .js-content-tab-item'));
  const items = allItems.filter(el => el.closest('.js-accordion-parent') === accordion);

  const total = items.length;
  if (total === 0) {
    return;
  }

  const completed = items.filter(isItemCompleted).length;
  const isAllDone = completed === total;
  const percentage = Math.round((completed / total) * 100);

  // 1. UPDATE OR INSERT HEADER PILL BADGE
  let badge = titleRow.querySelector(`.${BADGE_CLASS}`) as HTMLElement | null;
  if (!badge) {
    badge = document.createElement('div');
    badge.className = BADGE_CLASS;
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = '600';
    badge.style.borderRadius = '9999px';
    badge.style.padding = '4px 10px';
    badge.style.marginLeft = 'auto';
    badge.style.marginRight = '12px';
    badge.style.whiteSpace = 'nowrap';
    badge.style.transition = 'all 0.2s ease-in-out';
    badge.style.userSelect = 'none';

    // Insert right before the collapse arrow if present, otherwise append
    const arrow = titleRow.querySelector('.js-accordion-collapse-arrow, .collapse-arrow-icon');
    if (arrow && arrow.parentNode === titleRow) {
      titleRow.insertBefore(badge, arrow);
    } else {
      titleRow.appendChild(badge);
    }
  }

  // Set colors and content based on completion status
  if (isAllDone) {
    badge.style.background = '#dcfce7'; // green-100
    badge.style.color = '#15803d'; // green-700
    badge.style.border = '1px solid #86efac'; // green-300
    badge.title = `All ${total} lessons completed! 🎉`;
    badge.innerHTML = `${createCheckSvg('#15803d')} <span>${completed}/${total} Done</span>`;
  } else if (completed > 0) {
    badge.style.background = '#e0f2fe'; // sky-100
    badge.style.color = '#0369a1'; // sky-700
    badge.style.border = '1px solid #7dd3fc'; // sky-300
    badge.title = `${completed} of ${total} lessons completed (${percentage}%)`;
    const percentText = settings.options.showPercentage ? ` (${percentage}%)` : '';
    badge.innerHTML = `${createClockSvg('#0369a1')} <span>${completed}/${total} Done${percentText}</span>`;
  } else {
    badge.style.background = '#f3f4f6'; // gray-100
    badge.style.color = '#6b7280'; // gray-500
    badge.style.border = '1px solid #e5e7eb'; // gray-200
    badge.title = `0 of ${total} lessons completed`;
    badge.innerHTML = `<span>0/${total} Done</span>`;
  }

  // 2. UPDATE OR INSERT SUBTITLE BADGE (e.g. next to "3 Parts")
  const subtitleContainer = titleRow.querySelector('.text-gray-500, .font-12.text-gray-500');
  if (subtitleContainer) {
    let subtitleBadge = subtitleContainer.querySelector(`.${SUBTITLE_BADGE_CLASS}`) as HTMLElement | null;
    if (!subtitleBadge) {
      subtitleBadge = document.createElement('span');
      subtitleBadge.className = SUBTITLE_BADGE_CLASS;
      subtitleBadge.style.marginLeft = '6px';
      subtitleBadge.style.fontWeight = '500';
      subtitleContainer.appendChild(subtitleBadge);
    }

    if (isAllDone) {
      subtitleBadge.style.color = '#16a34a';
      subtitleBadge.textContent = `• ✓ All Done`;
    } else if (completed > 0) {
      subtitleBadge.style.color = '#0284c7';
      subtitleBadge.textContent = `• ${completed}/${total} Done`;
    } else {
      subtitleBadge.style.color = '#9ca3af';
      subtitleBadge.textContent = `• ${completed}/${total}`;
    }
  }

  // 3. HIGHLIGHT ACCORDION CONTAINER IF COMPLETE
  const parentCard = accordion as HTMLElement;
  if (settings.options.highlightCompleted && isAllDone) {
    parentCard.style.borderColor = '#86efac';
  } else {
    parentCard.style.borderColor = '';
  }
}

/**
 * Finds all Canva iframes and cleans their URLs
 */
function findCanvaEmbeds(): { iframe: HTMLIFrameElement; cleanUrl: string }[] {
  const iframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
  const results: { iframe: HTMLIFrameElement; cleanUrl: string }[] = [];

  for (const iframe of iframes) {
    const src = iframe.getAttribute('src') || iframe.getAttribute('data-src') || iframe.src || '';
    if (src.includes('canva.com/design/') || src.includes('canva.com')) {
      const cleanUrl = cleanCanvaUrl(src);
      results.push({ iframe, cleanUrl });
    }
  }

  return results;
}

/**
 * Injects or updates the clean "Open in Canva" button on top of embedded slides.
 * (Sidebar gradient button has been removed as requested for a cleaner UI).
 */
function processCanvaButtons(settings: UserSettings): void {
  // Always clean up any old sidebar card if present
  document.querySelectorAll(`.${CANVA_SIDEBAR_CARD_CLASS}`).forEach(el => el.remove());

  if (!settings.options.openCanvaButton) {
    removeCanvaButtons();
    return;
  }

  const canvaEmbeds = findCanvaEmbeds();

  if (canvaEmbeds.length === 0) {
    removeCanvaButtons();
    return;
  }

  // INJECT OVERLAY BUTTON DIRECTLY ON TOP OF EACH CANVA EMBED CONTAINER
  canvaEmbeds.forEach(({ iframe, cleanUrl: embedUrl }) => {
    const parentContainer = iframe.parentElement;
    if (!parentContainer) return;

    // Ensure parent container has relative positioning so the overlay button anchors cleanly
    if (getComputedStyle(parentContainer).position === 'static') {
      parentContainer.style.position = 'relative';
    }

    let embedBtn = parentContainer.querySelector(`.${CANVA_EMBED_BTN_CLASS}`) as HTMLElement | null;
    if (!embedBtn) {
      embedBtn = document.createElement('div');
      embedBtn.className = CANVA_EMBED_BTN_CLASS;
      embedBtn.style.position = 'absolute';
      embedBtn.style.top = '12px';
      embedBtn.style.right = '12px';
      embedBtn.style.zIndex = '20';
      parentContainer.appendChild(embedBtn);
    }

    embedBtn.innerHTML = `
      <a href="${embedUrl}" target="_blank" rel="noopener noreferrer" style="
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: rgba(15, 23, 42, 0.88);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 11.5px;
        font-weight: 600;
        padding: 5px 11px;
        border-radius: 8px;
        text-decoration: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.18);
        letter-spacing: -0.01em;
        transition: all 0.15s ease;
      " onmouseover="this.style.background='#0f172a'; this.style.transform='translateY(-1px)';"
         onmouseout="this.style.background='rgba(15, 23, 42, 0.88)'; this.style.transform='none';">
        <span>Open in Canva</span>
        ${createExternalLinkSvg(12)}
      </a>
    `;
  });
}

/**
 * Removes Canva buttons from the DOM.
 */
export function removeCanvaButtons(): void {
  document.querySelectorAll(`.${CANVA_SIDEBAR_CARD_CLASS}`).forEach(el => el.remove());
  document.querySelectorAll(`.${CANVA_EMBED_BTN_CLASS}`).forEach(el => el.remove());
}

/**
 * Removes all injected badges and buttons from the DOM.
 */
export function removeKhataAcademyBadges(): void {
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach(el => el.remove());
  document.querySelectorAll(`.${SUBTITLE_BADGE_CLASS}`).forEach(el => el.remove());
  removeCanvaButtons();
  document.querySelectorAll('.js-accordion-parent').forEach(el => {
    (el as HTMLElement).style.borderColor = '';
  });
}

/**
 * Scans and updates all chapter accordions and Canva embeds on the page.
 */
export function scanAndApplyKhataAcademy(settings: UserSettings): void {
  if (!settings.modules.khataAcademy) {
    removeKhataAcademyBadges();
    return;
  }

  // 1. Process chapter accordions
  const accordions = document.querySelectorAll('.js-accordion-parent');
  accordions.forEach(accordion => {
    try {
      processAccordion(accordion, settings);
    } catch (err) {
      console.error('[ItchScratcher:KhataAcademy] Error processing accordion:', err);
    }
  });

  // 2. Process Canva embeds & inject overlay button
  try {
    processCanvaButtons(settings);
  } catch (err) {
    console.error('[ItchScratcher:KhataAcademy] Error processing Canva embeds:', err);
  }
}

/**
 * Check if current page is Khata Academy or has its accordion structure or Canva embed
 */
export function isKhataAcademyPage(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.includes('khataacademy') || hostname.includes('khata')) {
    return true;
  }
  // Signature DOM structure
  if (document.querySelector('.js-accordion-parent') && document.querySelector('#chaptersAccordion, .sidebar-content-item')) {
    return true;
  }
  // Or contains Canva embeds on a course-like page
  if (document.querySelector('iframe[src*="canva.com"]') && document.querySelector('#chaptersAccordion')) {
    return true;
  }
  return false;
}
