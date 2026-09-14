let sidebar = null;
let peek = null;
let activeService = null;
let pinned = false;
let isHovered = false;
let hideTimer = null;

const SB_WIDTH = 58;
const SB_LEFT_GAP = 10;
const SB_OFFSET_OPEN = SB_LEFT_GAP + SB_WIDTH + 6;

function injectCSS() {
  if (document.getElementById('office-sidebar-style')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'office-sidebar-style';
  style.textContent = `
    :root {
      --ofs-sb-w: ${SB_WIDTH}px;
      --ofs-sb-offset: 0px;
      --ofs-sb-bg: rgba(255,255,255,0.78);
      --ofs-sb-border: rgba(10,20,40,0.10);
      --ofs-sb-fg: #1a2230;
      --ofs-sb-muted: rgba(20,35,60,0.55);
      --ofs-sb-hover: rgba(0,60,160,0.08);
      --ofs-sb-active: rgba(0,120,212,0.16);
      --ofs-sb-tip-bg: rgba(255,255,255,0.95);
      --ofs-sb-tip-fg: #1a2230;
      --ofs-sb-glow: rgba(0,120,212,0.45);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --ofs-sb-bg: rgba(17,23,33,0.72);
        --ofs-sb-border: rgba(255,255,255,0.10);
        --ofs-sb-fg: #e8edf5;
        --ofs-sb-muted: rgba(230,240,255,0.5);
        --ofs-sb-hover: rgba(255,255,255,0.07);
        --ofs-sb-active: rgba(0,120,212,0.32);
        --ofs-sb-tip-bg: rgba(28,34,46,0.95);
        --ofs-sb-tip-fg: #e8edf5;
      }
    }

    :root[style*="color-scheme: dark"],
    :root[style*="color-scheme:dark"] {
      --ofs-sb-bg: rgba(17,23,33,0.72);
      --ofs-sb-border: rgba(255,255,255,0.10);
      --ofs-sb-fg: #e8edf5;
      --ofs-sb-muted: rgba(230,240,255,0.5);
      --ofs-sb-hover: rgba(255,255,255,0.07);
      --ofs-sb-active: rgba(0,120,212,0.32);
      --ofs-sb-tip-bg: rgba(28,34,46,0.95);
      --ofs-sb-tip-fg: #e8edf5;
    }

    html {
      overflow-x: hidden;
    }

    body {
      margin-left: var(--ofs-sb-offset) !important;
      width: auto !important;
      transition: margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    #office-sb-peek {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      width: 14px;
      z-index: 999998;
      cursor: default;
    }

    #office-sb-peek .office-peek-tab {
      position: absolute;
      top: 50%;
      left: 4px;
      width: 3px;
      height: 64px;
      margin-top: -32px;
      border-radius: 3px;
      background: var(--ofs-sb-muted);
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    #office-sb-peek:hover .office-peek-tab,
    #office-sb-peek.glow .office-peek-tab {
      opacity: 0.95;
    }

    #office-sidebar {
      position: fixed;
      top: ${SB_LEFT_GAP}px;
      bottom: ${SB_LEFT_GAP}px;
      left: ${SB_LEFT_GAP}px;
      width: var(--ofs-sb-w);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 7px;
      box-sizing: border-box;
      z-index: 999999;
      border-radius: 18px;
      background: var(--ofs-sb-bg);
      -webkit-backdrop-filter: blur(24px) saturate(160%);
      backdrop-filter: blur(24px) saturate(160%);
      border: 1px solid var(--ofs-sb-border);
      box-shadow: 0 10px 34px rgba(0,0,0,0.26), 0 2px 8px rgba(0,0,0,0.16);
      transform: translateX(0);
      opacity: 1;
      transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease;
    }

    #office-sidebar.hidden {
      transform: translateX(calc(-100% - 26px));
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }

    .office-brand {
      width: 42px;
      height: 42px;
      border-radius: 13px;
      margin-bottom: 14px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #fff;
      background: linear-gradient(135deg, #0078d4 0%, #2b7a44 55%, #a4373a 100%);
      box-shadow: 0 4px 14px var(--ofs-sb-glow);
      cursor: pointer;
      user-select: none;
    }

    .office-nav {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      overflow: visible;
    }

    .office-service-btn {
      position: relative;
      width: 42px;
      height: 42px;
      margin: 3px 0;
      border: none;
      border-radius: 13px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    }

    .office-service-btn:hover {
      background: var(--ofs-sb-hover);
      transform: translateX(2px);
    }

    .office-service-btn.active {
      background: var(--ofs-sb-active);
      box-shadow: 0 0 0 1px var(--ofs-sb-border);
    }

    .office-service-btn.active::before {
      content: "";
      position: absolute;
      left: -6px;
      top: 50%;
      width: 3px;
      height: 20px;
      margin-top: -10px;
      border-radius: 3px;
      background: #0078d4;
    }

    .office-service-icon {
      font-size: 15px;
      font-weight: 700;
      line-height: 1;
      transition: transform 0.18s ease;
    }

    .office-service-btn:hover .office-service-icon {
      transform: scale(1.12);
    }

    .office-service-btn[data-service="word"] .office-service-icon { color: #4aa3ff; }
    .office-service-btn[data-service="excel"] .office-service-icon { color: #45d483; }
    .office-service-btn[data-service="powerpoint"] .office-service-icon { color: #ff8a5c; }
    .office-service-btn[data-service="onedrive"] .office-service-icon { color: #5bb8ff; }
    .office-service-btn[data-service="onenote"] .office-service-icon { color: #c08df5; }

    .office-sidebar-footer {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }

    .office-sidebar-btn {
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--ofs-sb-fg);
      font-size: 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.18s ease, transform 0.18s ease;
    }

    .office-sidebar-btn:hover {
      background: var(--ofs-sb-hover);
      transform: scale(1.08);
    }

    .office-sidebar-btn.active {
      background: var(--ofs-sb-active);
      color: #0078d4;
    }

    #office-profile-btn {
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 50%;
      font-size: 15px;
      cursor: pointer;
      color: var(--ofs-sb-fg);
      background: linear-gradient(135deg, rgba(0,120,212,0.35), rgba(164,55,58,0.35));
      display: flex;
      align-items: center;
      justify-content: center;
      transition: filter 0.18s ease, transform 0.18s ease;
    }

    #office-profile-btn:hover {
      filter: brightness(1.2);
      transform: scale(1.08);
    }

    .office-tooltip {
      position: fixed;
      z-index: 1000000;
      padding: 6px 12px;
      border-radius: 10px;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 12.5px;
      font-weight: 500;
      letter-spacing: 0.2px;
      background: var(--ofs-sb-tip-bg);
      color: var(--ofs-sb-tip-fg);
      border: 1px solid var(--ofs-sb-border);
      box-shadow: 0 8px 24px rgba(0,0,0,0.28);
      pointer-events: none;
      opacity: 0;
      transform: translateX(-4px);
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .office-tooltip.visible {
      opacity: 1;
      transform: translateX(0);
    }
  `;
  document.head.appendChild(style);
}

function applyOffset() {
  const open = !sidebar.classList.contains('hidden');
  const px = open ? SB_OFFSET_OPEN : 0;
  document.documentElement.style.setProperty('--ofs-sb-offset', `${px}px`);
}

function reveal() {
  if (!sidebar || pinned) return;
  clearTimeout(hideTimer);
  sidebar.classList.remove('hidden');
  isHovered = false;
  applyOffset();
}

function scheduleHide(delay = 420) {
  if (!sidebar || pinned) return;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    hide();
  }, delay);
}

function hide() {
  if (!sidebar || pinned) return;
  sidebar.classList.add('hidden');
  applyOffset();
}

function revealFromPeek() {
  if (pinned) return;
  clearTimeout(hideTimer);
  reveal();
  // Keep it open while the cursor lingers on the peek edge.
  if (peek) peek.classList.add('glow');
}

function createTooltip() {
  const tooltip = document.createElement('div');
  tooltip.className = 'office-tooltip';
  document.body.appendChild(tooltip);
  return tooltip;
}

function showTooltip(btn, text) {
  let tooltip = document.querySelector('.office-tooltip');
  if (!tooltip) {
    tooltip = createTooltip();
  }
  const rect = btn.getBoundingClientRect();
  tooltip.textContent = text;
  tooltip.style.left = (rect.right + 14) + 'px';
  tooltip.style.top = (rect.top + rect.height / 2) + 'px';
  tooltip.style.transform = 'translateY(-50%)';
  tooltip.classList.add('visible');
  requestAnimationFrame(() => {
    tooltip.style.transform = 'translateY(-50%) translateX(0)';
  });
}

function hideTooltip() {
  const tooltip = document.querySelector('.office-tooltip');
  if (tooltip) {
    tooltip.classList.remove('visible');
  }
}

function getServiceIcon(serviceId) {
  const icons = {
    word: 'W',
    excel: 'X',
    powerpoint: 'P',
    onedrive: '☁',
    onenote: 'N'
  };
  return icons[serviceId] || '•';
}

function getServiceLabel(serviceId) {
  const labels = {
    word: 'Word',
    excel: 'Excel',
    powerpoint: 'PowerPoint',
    onedrive: 'OneDrive',
    onenote: 'OneNote'
  };
  return labels[serviceId] || serviceId;
}

function closeSidebar() {
  if (sidebar) {
    sidebar.remove();
    sidebar = null;
  }
  if (peek) {
    peek.remove();
    peek = null;
  }
  const styleEl = document.getElementById('office-sidebar-style');
  if (styleEl) {
    styleEl.remove();
  }
}

function createSidebar(services, activeId) {
  closeSidebar();

  activeService = activeId;

  sidebar = document.createElement('div');
  sidebar.id = 'office-sidebar';
  sidebar.classList.add('hidden');

  const brand = document.createElement('div');
  brand.className = 'office-brand';
  brand.textContent = 'OF';
  brand.title = 'Office for Linux — hover the left edge or pin to keep open';
  sidebar.appendChild(brand);

  const nav = document.createElement('nav');
  nav.className = 'office-nav';

  for (const service of services) {
    const btn = document.createElement('button');
    btn.className = 'office-service-btn';
    btn.dataset.service = service.id;

    const icon = document.createElement('span');
    icon.className = 'office-service-icon';
    icon.textContent = getServiceIcon(service.id);
    btn.appendChild(icon);

    btn.addEventListener('mouseenter', (e) => {
      showTooltip(btn, service.name);
      reveal();
    });
    btn.addEventListener('mouseleave', hideTooltip);
    btn.addEventListener('click', () => {
      if (window.electronAPI.switchService) {
        window.electronAPI.switchService(service.id);
      }
    });

    if (service.id === activeId) {
      btn.classList.add('active');
    }

    nav.appendChild(btn);
  }

  sidebar.appendChild(nav);

  const footer = document.createElement('div');
  footer.className = 'office-sidebar-footer';

  const profileBtn = document.createElement('button');
  profileBtn.id = 'office-profile-btn';
  profileBtn.textContent = '👤';
  profileBtn.title = 'Switch profile';
  profileBtn.addEventListener('mouseenter', () => showTooltip(profileBtn, 'Switch profile'));
  profileBtn.addEventListener('mouseleave', hideTooltip);
  profileBtn.addEventListener('click', async () => {
    try {
      if (!window.electronAPI.switchProfile || !window.electronAPI.getProfiles) {
        return;
      }
      const profiles = await window.electronAPI.getProfiles();
      if (!profiles || profiles.length === 0) {
        return;
      }
      const current = await window.electronAPI.getActiveProfile();
      const curId = current && current.id ? current.id : profiles[0].id;
      const index = profiles.findIndex((p) => p.id === curId);
      const next = profiles[(index + 1) % profiles.length];
      window.electronAPI.switchProfile(next.id);
    } catch (err) {
      console.warn('[Office] Profile switch failed:', err);
    }
  });
  footer.appendChild(profileBtn);

  const pinBtn = document.createElement('button');
  pinBtn.id = 'office-pin-btn';
  pinBtn.className = 'office-sidebar-btn';
  pinBtn.textContent = '📌';
  pinBtn.title = 'Pin sidebar';
  pinBtn.addEventListener('mouseenter', () => showTooltip(pinBtn, pinned ? 'Unpin sidebar' : 'Pin sidebar'));
  pinBtn.addEventListener('mouseleave', hideTooltip);
  pinBtn.addEventListener('click', () => {
    pinned = !pinned;
    pinBtn.classList.toggle('active', pinned);
    pinBtn.title = pinned ? 'Unpin sidebar' : 'Pin sidebar';
    if (pinned) {
      clearTimeout(hideTimer);
      sidebar.classList.remove('hidden');
      applyOffset();
    } else {
      scheduleHide(350);
    }
  });
  footer.appendChild(pinBtn);

  const settingsBtn = document.createElement('button');
  settingsBtn.id = 'office-settings-btn';
  settingsBtn.className = 'office-sidebar-btn';
  settingsBtn.textContent = '⚙';
  settingsBtn.title = 'Microsoft account';
  settingsBtn.addEventListener('mouseenter', () => showTooltip(settingsBtn, 'Microsoft account'));
  settingsBtn.addEventListener('mouseleave', hideTooltip);
  settingsBtn.addEventListener('click', () => {
    if (window.electronAPI.openExternal) {
      window.electronAPI.openExternal('https://account.microsoft.com');
    }
  });
  footer.appendChild(settingsBtn);

  sidebar.appendChild(footer);

  peek = document.createElement('div');
  peek.id = 'office-sb-peek';
  const peekTab = document.createElement('span');
  peekTab.className = 'office-peek-tab';
  peek.appendChild(peekTab);

  sidebar.addEventListener('mouseenter', () => {
    if (pinned) return;
    isHovered = true;
    clearTimeout(hideTimer);
    sidebar.classList.remove('hidden');
    applyOffset();
  });
  sidebar.addEventListener('mouseleave', () => {
    isHovered = false;
    scheduleHide();
  });

  peek.addEventListener('mouseenter', revealFromPeek);
  peek.addEventListener('mouseleave', () => {
    peek.classList.remove('glow');
    if (!pinned && !isHovered) {
      scheduleHide(200);
    }
  });

  document.body.appendChild(sidebar);
  document.body.appendChild(peek);

  sidebar.classList.add('hidden');
  applyOffset();

  // Brief first-time reveal so the user discovers the sidebar.
  setTimeout(() => {
    if (!pinned && !isHovered) {
      reveal();
      setTimeout(() => {
        if (!pinned && !isHovered) {
          hide();
        }
      }, 2000);
    }
  }, 350);
}

function setActiveService(serviceId) {
  activeService = serviceId;
  document.querySelectorAll('.office-service-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.service === serviceId);
  });
}

function getSidebarState() {
  return { pinned };
}

function initSidebar() {
  const services = window.electronAPI.getServices ? window.electronAPI.getServices() : [];
  const activeId = window.electronAPI.getActiveService ? window.electronAPI.getActiveService() : 'word';

  injectCSS();
  createSidebar(services, activeId);

  if (window.electronAPI.onServiceChanged) {
    window.electronAPI.onServiceChanged((serviceId) => {
      setActiveService(serviceId);
      if (pinned && sidebar) {
        reveal();
      }
    });
  }
}

module.exports = { initSidebar, setActiveService, getSidebarState };