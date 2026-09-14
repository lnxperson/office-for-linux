let sidebar = null;
let activeService = null;

function injectCSS() {
  const style = document.createElement('style');
  style.id = 'ms365-sidebar-style';
  style.textContent = `
    #ms365-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      width: 48px;
      height: 100vh;
      background: #1f2733;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 0;
      box-shadow: 2px 0 8px rgba(0,0,0,0.2);
      transition: width 0.2s ease;
      overflow: hidden;
    }

    #ms365-sidebar.expanded {
      width: 200px;
    }

    #ms365-sidebar-toggle {
      background: none;
      border: none;
      color: white;
      font-size: 16px;
      cursor: pointer;
      padding: 8px;
      margin-bottom: 8px;
      border-radius: 4px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #ms365-sidebar-toggle:hover {
      background: rgba(255,255,255,0.1);
    }

    .ms365-service-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: white;
      font-size: 20px;
      padding: 0;
      margin: 4px 0;
      width: 44px;
      height: 44px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .ms365-service-btn:hover {
      background: rgba(255,255,255,0.12);
    }

    .ms365-service-btn.active {
      background: rgba(255,255,255,0.18);
      outline: 2px solid #0078d4;
    }

    .ms365-service-label {
      font-family: 'Segoe UI', 'Ubuntu', sans-serif;
      font-size: 12px;
      white-space: nowrap;
    }

    .ms365-service-icon {
      font-family: 'Segoe UI', 'Ubuntu', sans-serif;
      font-weight: 600;
      font-size: 16px;
      line-height: 1;
    }

    #ms365-sidebar-footer {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    #ms365-profile-btn {
      background: #0078d4;
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 8px 0;
    }

    #ms365-profile-btn:hover {
      filter: brightness(1.2);
    }

    #ms365-settings-btn {
      background: none;
      border: none;
      color: rgba(255,255,255,0.8);
      font-size: 18px;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #ms365-settings-btn:hover {
      background: rgba(255,255,255,0.1);
    }

    .ms365-tooltip {
      position: fixed;
      background: #2f3a47;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: 'Segoe UI', 'Ubuntu', sans-serif;
      pointer-events: none;
      z-index: 1000000;
      opacity: 0;
      transition: opacity 0.15s;
    }

    .ms365-tooltip.visible {
      opacity: 1;
    }

    .ms365-service-name {
      font-family: 'Segoe UI', 'Ubuntu', sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: white;
      margin: 4px 0 8px 4px;
      text-align: left;
      width: 100%;
      padding-left: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;
  document.head.appendChild(style);
}

function createTooltip() {
  const tooltip = document.createElement('div');
  tooltip.className = 'ms365-tooltip';
  document.body.appendChild(tooltip);
  return tooltip;
}

function getServiceIcon(serviceId) {
  const icons = {
    word: 'W',
    excel: 'X',
    powerpoint: 'P',
    onedrive: '📁',
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

function createSidebar(services, activeId, profiles) {
  if (sidebar) {
    sidebar.remove();
  }

  sidebar = document.createElement('div');
  sidebar.id = 'ms365-sidebar';
  activeService = activeId;

  const toggle = document.createElement('button');
  toggle.id = 'ms365-sidebar-toggle';
  toggle.innerHTML = '☰';
  toggle.title = 'Toggle sidebar';
  toggle.onclick = () => {
    sidebar.classList.toggle('expanded');
    toggle.innerHTML = sidebar.classList.contains('expanded') ? '×' : '☰';
  };
  sidebar.appendChild(toggle);

  const serviceName = document.createElement('div');
  serviceName.className = 'ms365-service-name';
  serviceName.textContent = getServiceLabel(activeId);
  sidebar.appendChild(serviceName);

  for (const service of services) {
    const btn = document.createElement('button');
    btn.className = 'ms365-service-btn';
    btn.dataset.service = service.id;
    btn.title = service.name;

    const icon = document.createElement('span');
    icon.className = 'ms365-service-icon';
    icon.textContent = getServiceIcon(service.id);
    btn.appendChild(icon);

    btn.onclick = () => {
      window.electronAPI.switchService(service.id);
    };

    if (service.id === activeId) {
      btn.classList.add('active');
    }

    sidebar.appendChild(btn);
    btn.addEventListener('mouseenter', (e) => showTooltip(e, service.name));
    btn.addEventListener('mouseleave', () => hideTooltip());
  }

  const footer = document.createElement('div');
  footer.id = 'ms365-sidebar-footer';

  const profileBtn = document.createElement('button');
  profileBtn.id = 'ms365-profile-btn';
  profileBtn.textContent = '👤';
  profileBtn.title = 'Profile';
  profileBtn.onclick = () => {
    const profiles = window.electronAPI.getProfiles ? window.electronAPI.getProfiles() : [];
    if (window.electronAPI.switchProfile && profiles.length > 0) {
      const current = window.electronAPI.getActiveProfile ? window.electronAPI.getActiveProfile() : profiles[0];
      const next = profiles[(profiles.findIndex((p) => p.id === current.id) + 1) % profiles.length];
      window.electronAPI.switchProfile(next.id);
    }
  };
  footer.appendChild(profileBtn);

  const settingsBtn = document.createElement('button');
  settingsBtn.id = 'ms365-settings-btn';
  settingsBtn.textContent = '⚙';
  settingsBtn.title = 'Settings';
  settingsBtn.onclick = () => {
    window.location.href = 'https://account.microsoft.com';
  };
  footer.appendChild(settingsBtn);

  sidebar.appendChild(footer);
  document.body.appendChild(sidebar);

  // Adjust main content area to not be hidden behind the sidebar
  applyContentOffset();
}

function applyContentOffset() {
  const styleEl = document.getElementById('ms365-sidebar-style');
  if (styleEl) {
    styleEl.textContent = styleEl.textContent.replace(
      /--ms365-sidebar-width:[^;]+;?/,
      '--ms365-sidebar-width: 48px;'
    );
    if (!styleEl.textContent.includes('--ms365-sidebar-offset')) {
      styleEl.textContent += `
        body { margin-left: 48px; width: calc(100% - 48px); }
        html { overflow-x: hidden; }
      `;
    }
  }
}

function showTooltip(event, text) {
  let tooltip = document.querySelector('.ms365-tooltip');
  if (!tooltip) {
    tooltip = createTooltip();
  }
  tooltip.textContent = text;
  tooltip.style.left = (event.clientX + 14) + 'px';
  tooltip.style.top = (event.clientY - 8) + 'px';
  tooltip.classList.add('visible');
}

function hideTooltip() {
  const tooltip = document.querySelector('.ms365-tooltip');
  if (tooltip) {
    tooltip.classList.remove('visible');
  }
}

function setActiveService(serviceId) {
  activeService = serviceId;
  document.querySelectorAll('.ms365-service-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.service === serviceId);
  });

  const serviceName = document.querySelector('.ms365-service-name');
  if (serviceName) {
    serviceName.textContent = getServiceLabel(serviceId);
  }
}

function initSidebar() {
  const services = window.electronAPI.getServices ? window.electronAPI.getServices() : [];
  const activeId = window.electronAPI.getActiveService ? window.electronAPI.getActiveService() : 'word';

  injectCSS();
  createSidebar(services, activeId);

  if (window.electronAPI.onServiceChanged) {
    window.electronAPI.onServiceChanged(setActiveService);
  }
}

module.exports = { initSidebar, setActiveService };