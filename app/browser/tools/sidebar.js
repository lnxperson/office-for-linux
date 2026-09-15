let sidebar = null;
let titlebar = null;
let activeService = null;
let isOpen = false;
let isMaximized = false;

const { webFrame } = require('electron');

const SB_WIDTH = 58;
const SB_PADDING = 10;
const TB_HEIGHT = 38;

function sendLog(message) {
  if (window.electronAPI && window.electronAPI.sendLog) {
    window.electronAPI.sendLog(message);
  }
}

let styleKey = null;
function injectCSS() {
  if (styleKey !== null) return;

  const css = `
    @media (prefers-color-scheme: dark) {
      #office-titlebar { background: rgba(30,34,44,0.92); border-bottom: 1px solid rgba(255,255,255,0.06); }
      #office-titlebar .tb-btn:hover { background: rgba(255,255,255,0.1); }
      #office-titlebar .tb-btn.close:hover { background: #c42b1c; }
      #office-titlebar .tb-btn svg { color: #ddd; }
      #office-titlebar .tb-btn.close svg { color: #ddd; }
    }

    :root[style*="color-scheme: dark"],
    :root[style*="color-scheme:dark"] {
      #office-titlebar { background: rgba(30,34,44,0.92); border-bottom: 1px solid rgba(255,255,255,0.06); }
      #office-titlebar .tb-btn:hover { background: rgba(255,255,255,0.1); }
      #office-titlebar .tb-btn.close:hover { background: #c42b1c; }
      #office-titlebar .tb-btn svg { color: #ddd; }
    }

    #office-titlebar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: ${TB_HEIGHT}px;
      z-index: 1000002;
      display: flex;
      align-items: center;
      padding: 0 4px;
      background: rgba(245,247,250,0.88);
      border-bottom: 1px solid rgba(10,20,40,0.08);
      -webkit-app-region: drag;
      user-select: none;
    }

    #office-titlebar .tb-controls {
      display: flex;
      align-items: center;
      gap: 2px;
      -webkit-app-region: no-drag;
    }

    #office-titlebar .tb-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
      -webkit-app-region: no-drag;
    }

    #office-titlebar .tb-btn:hover { background: rgba(0,0,0,0.06); }

    #office-titlebar .tb-btn.close:hover { background: #c42b1c; }
    #office-titlebar .tb-btn.close:hover svg { color: #fff; }

    #office-titlebar .tb-btn svg {
      width: 16px;
      height: 16px;
      color: #333;
    }

    #office-titlebar .tb-spacer {
      flex: 1;
      -webkit-app-region: drag;
    }

    #office-sidebar {
      position: fixed;
      top: ${SB_PADDING}px;
      bottom: ${SB_PADDING}px;
      left: ${SB_PADDING}px;
      width: ${SB_WIDTH}px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 7px;
      box-sizing: border-box;
      z-index: 999999;
      border-radius: 18px;
      background: rgba(240,242,245,0.82);
      -webkit-backdrop-filter: blur(28px) saturate(170%);
      backdrop-filter: blur(28px) saturate(170%);
      border: 1px solid rgba(10,20,40,0.08);
      box-shadow: 0 12px 40px rgba(0,0,0,0.22), 0 2px 10px rgba(0,0,0,0.12);
      opacity: 1;
      transition: transform 0.32s cubic-bezier(0.4, 0, 0.1, 1);
      transform: translateX(0);
    }

    @media (prefers-color-scheme: dark) {
      #office-sidebar {
        background: rgba(30,34,44,0.78);
        border: 1px solid rgba(255,255,255,0.08);
      }
    }

    :root[style*="color-scheme: dark"],
    :root[style*="color-scheme:dark"] {
      #office-sidebar {
        background: rgba(30,34,44,0.78);
        border: 1px solid rgba(255,255,255,0.08);
      }
    }

    #office-sidebar.hidden {
      transform: translateX(calc(-100% - ${SB_PADDING * 2}px));
      pointer-events: none;
    }

    .office-brand {
      width: 42px;
      height: 42px;
      border-radius: 13px;
      margin-bottom: 12px;
      flex-shrink: 0;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }

    .office-brand img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
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
      transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    }

    .office-service-btn:hover {
      background: rgba(0,60,160,0.08);
      transform: translateX(2px);
    }

    .office-service-btn.active {
      background: rgba(0,120,212,0.14);
      box-shadow: 0 0 0 1px rgba(10,20,40,0.08);
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
      width: 26px;
      height: 26px;
      border-radius: 6px;
      object-fit: contain;
      transition: transform 0.18s ease;
    }

    .office-service-btn:hover .office-service-icon {
      transform: scale(1.10);
    }

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
      color: #333;
      font-size: 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.18s ease, transform 0.18s ease;
    }

    @media (prefers-color-scheme: dark) {
      .office-sidebar-btn { color: #ddd; }
    }

    .office-sidebar-btn:hover {
      background: rgba(0,60,160,0.08);
      transform: scale(1.08);
    }

    #office-profile-btn {
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 50%;
      font-size: 15px;
      cursor: pointer;
      color: #555;
      background: linear-gradient(135deg, rgba(0,120,212,0.35), rgba(164,55,58,0.35));
      display: flex;
      align-items: center;
      justify-content: center;
      transition: filter 0.18s ease, transform 0.18s ease;
    }

    @media (prefers-color-scheme: dark) {
      #office-profile-btn { color: #ccc; }
    }

    #office-profile-btn:hover {
      filter: brightness(1.15);
      transform: scale(1.08);
    }

    .office-tooltip {
      position: fixed;
      z-index: 1000003;
      padding: 6px 12px;
      border-radius: 10px;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 12.5px;
      font-weight: 500;
      letter-spacing: 0.2px;
      background: rgba(255,255,255,0.95);
      color: #1a2230;
      border: 1px solid rgba(10,20,40,0.10);
      box-shadow: 0 8px 24px rgba(0,0,0,0.28);
      pointer-events: none;
      opacity: 0;
      transform: translateX(-4px);
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    @media (prefers-color-scheme: dark) {
      .office-tooltip {
        background: rgba(30,34,46,0.95);
        color: #e8edf5;
        border: 1px solid rgba(255,255,255,0.10);
      }
    }

    .office-tooltip.visible {
      opacity: 1;
      transform: translateX(0);
    }
  `;

  try {
    styleKey = webFrame.insertCSS(css);
    sendLog('Sidebar CSS injected via webFrame.insertCSS');
  } catch (err) {
    console.warn('[Office] webFrame.insertCSS failed, falling back to <style>:', err);
    const style = document.createElement('style');
    style.id = 'office-sidebar-style';
    style.textContent = css;
    document.head.appendChild(style);
  }
}

function toggleSidebar() {
  if (!sidebar) return;
  isOpen = !isOpen;
  sidebar.classList.toggle('hidden', !isOpen);
}

function updateToggleIcon() {
  if (!titlebar) return;
  const btn = titlebar.querySelector('#office-sidebar-toggle');
  if (!btn) return;
  btn.innerHTML = isOpen
    ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>';
  btn.title = isOpen ? 'Close sidebar' : 'Open sidebar';
}

function menuIcon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>';
}

function minimizeIcon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M5 12h14"/></svg>';
}

function maximizeIcon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="2" stroke-width="2" fill="none"/></svg>';
}

function restoreIcon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="12" height="12" rx="1.5" stroke-width="2" fill="none"/><path d="M8 8h12v12H8z" fill="none" stroke-width="2" rx="1.5"/></svg>';
}

function closeIcon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>';
}

function createTooltip() {
  const tooltip = document.createElement('div');
  tooltip.className = 'office-tooltip';
  document.body.appendChild(tooltip);
  return tooltip;
}

function showTooltip(btn, text) {
  let tooltip = document.querySelector('.office-tooltip');
  if (!tooltip) tooltip = createTooltip();
  const rect = btn.getBoundingClientRect();
  tooltip.textContent = text;
  tooltip.style.left = (rect.right + 10) + 'px';
  tooltip.style.top = (rect.top + rect.height / 2) + 'px';
  tooltip.style.transform = 'translateY(-50%)';
  tooltip.classList.add('visible');
  requestAnimationFrame(() => {
    tooltip.style.transform = 'translateY(-50%) translateX(0)';
  });
}

function hideTooltip() {
  const tooltip = document.querySelector('.office-tooltip');
  if (tooltip) tooltip.classList.remove('visible');
}

function cleanup() {
  if (titlebar) { titlebar.remove(); titlebar = null; }
  if (sidebar) { sidebar.remove(); sidebar = null; }
}

function createTitlebar() {
  titlebar = document.createElement('div');
  titlebar.id = 'office-titlebar';

  const controls = document.createElement('div');
  controls.className = 'tb-controls';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'tb-btn';
  toggleBtn.id = 'office-sidebar-toggle';
  toggleBtn.innerHTML = menuIcon();
  toggleBtn.title = 'Open sidebar';
  toggleBtn.addEventListener('click', () => { toggleSidebar(); updateToggleIcon(); });
  toggleBtn.addEventListener('mouseenter', () => showTooltip(toggleBtn, 'Toggle sidebar'));
  toggleBtn.addEventListener('mouseleave', hideTooltip);
  controls.appendChild(toggleBtn);

  const minBtn = document.createElement('button');
  minBtn.className = 'tb-btn';
  minBtn.innerHTML = minimizeIcon();
  minBtn.title = 'Minimize';
  minBtn.addEventListener('click', () => { if (window.electronAPI.minimizeWindow) window.electronAPI.minimizeWindow(); });
  controls.appendChild(minBtn);

  const maxBtn = document.createElement('button');
  maxBtn.className = 'tb-btn';
  maxBtn.id = 'office-maximize-btn';
  maxBtn.innerHTML = maximizeIcon();
  maxBtn.title = 'Maximize';
  maxBtn.addEventListener('click', () => { if (window.electronAPI.maximizeWindow) window.electronAPI.maximizeWindow(); });
  controls.appendChild(maxBtn);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'tb-btn close';
  closeBtn.innerHTML = closeIcon();
  closeBtn.title = 'Close';
  closeBtn.addEventListener('click', () => { if (window.electronAPI.closeWindow) window.electronAPI.closeWindow(); });
  controls.appendChild(closeBtn);

  titlebar.appendChild(controls);

  const spacer = document.createElement('div');
  spacer.className = 'tb-spacer';
  titlebar.appendChild(spacer);

  document.body.appendChild(titlebar);

  if (window.electronAPI.isWindowMaximized) {
    window.electronAPI.isWindowMaximized().then((max) => {
      isMaximized = max;
      updateMaximizeButton();
    }).catch(() => {});
  }

  if (window.electronAPI.onWindowMaximizeChange) {
    window.electronAPI.onWindowMaximizeChange((max) => {
      isMaximized = max;
      updateMaximizeButton();
    });
  }
}

function updateMaximizeButton() {
  if (!titlebar) return;
  const btn = titlebar.querySelector('#office-maximize-btn');
  if (!btn) return;
  btn.innerHTML = isMaximized ? restoreIcon() : maximizeIcon();
  btn.title = isMaximized ? 'Restore' : 'Maximize';
}

function createSidebar(services, activeId) {
  activeService = activeId;

  const icons = (window.electronAPI.getServiceIcons && window.electronAPI.getServiceIcons()) || {};
  const logo = (window.electronAPI.getBrandLogo && window.electronAPI.getBrandLogo()) || null;

  sidebar = document.createElement('div');
  sidebar.id = 'office-sidebar';
  sidebar.classList.add('hidden');

  const brand = document.createElement('div');
  brand.className = 'office-brand';
  if (logo) {
    const img = document.createElement('img');
    img.src = logo;
    img.alt = 'Office for Linux';
    brand.appendChild(img);
  } else {
    brand.textContent = 'OF';
    brand.style.cssText = 'font-size:13px;font-weight:700;color:#fff;background:linear-gradient(135deg,#0078d4,#2b7a44,#a4373a);display:flex;align-items:center;justify-content:center;';
  }
  sidebar.appendChild(brand);

  const nav = document.createElement('nav');
  nav.className = 'office-nav';

  for (const service of services) {
    const btn = document.createElement('button');
    btn.className = 'office-service-btn';
    btn.dataset.service = service.id;

    const img = document.createElement('img');
    img.className = 'office-service-icon';
    if (icons[service.id]) {
      img.src = icons[service.id];
    } else {
      img.alt = service.name;
      img.style.cssText = `width:26px;height:26px;border-radius:6px;background:${service.color || '#666'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;`;
      const span = document.createElement('span');
      span.textContent = service.name[0];
      img.replaceWith(span);
      span.style.cssText = `width:26px;height:26px;border-radius:6px;background:${service.color || '#666'};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;`;
      btn.appendChild(span);
    }
    btn.appendChild(img);

    btn.addEventListener('mouseenter', () => showTooltip(btn, service.name));
    btn.addEventListener('mouseleave', hideTooltip);
    btn.addEventListener('click', () => {
      if (window.electronAPI.switchService) {
        window.electronAPI.switchService(service.id);
      }
    });

    if (service.id === activeId) btn.classList.add('active');
    nav.appendChild(btn);
  }

  sidebar.appendChild(nav);

  const footer = document.createElement('div');
  footer.className = 'office-sidebar-footer';

  const profileBtn = document.createElement('button');
  profileBtn.id = 'office-profile-btn';
  profileBtn.textContent = '\u{1F464}';
  profileBtn.title = 'Switch profile';
  profileBtn.addEventListener('mouseenter', () => showTooltip(profileBtn, 'Switch profile'));
  profileBtn.addEventListener('mouseleave', hideTooltip);
  profileBtn.addEventListener('click', async () => {
    try {
      if (!window.electronAPI.switchProfile || !window.electronAPI.getProfiles) return;
      const profiles = await window.electronAPI.getProfiles();
      if (!profiles || profiles.length === 0) return;
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

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'office-sidebar-btn';
  settingsBtn.textContent = '\u2699\uFE0F';
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
  document.body.appendChild(sidebar);
}

function setActiveService(serviceId) {
  activeService = serviceId;
  document.querySelectorAll('.office-service-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.service === serviceId);
  });
}

function initSidebar() {
  const start = () => {
    const services = window.electronAPI.getServices ? window.electronAPI.getServices() : [];
    let activeId = 'word';

    injectCSS();
    createTitlebar();
    createSidebar(services, activeId);
    sendLog(`Sidebar created (${services.length} services) with titlebar`);

    if (window.electronAPI.getActiveService) {
      window.electronAPI.getActiveService().then((id) => {
        if (id && sidebar) setActiveService(id);
      }).catch(() => {});
    }

    if (window.electronAPI.onServiceChanged) {
      window.electronAPI.onServiceChanged((serviceId) => {
        if (sidebar) setActiveService(serviceId);
      });
    }

    const guard = new MutationObserver(() => {
      const hasSidebar = document.getElementById('office-sidebar');
      const hasTitlebar = document.getElementById('office-titlebar');
      if (!hasTitlebar) {
        styleKey = null;
        injectCSS();
        createTitlebar();
      }
      if (!hasSidebar) {
        styleKey = null;
        injectCSS();
        createSidebar(services, activeId);
        if (window.electronAPI.getActiveService) {
          window.electronAPI.getActiveService().then((id) => {
            if (id && sidebar) setActiveService(id);
          }).catch(() => {});
        }
      }
    });
    guard.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.body) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  }
}

module.exports = { initSidebar, setActiveService, toggleSidebar };
