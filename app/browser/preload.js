const { ipcRenderer, webFrame } = require('electron');
const path = require('path');
const fs = require('fs');
const { SERVICES } = require(path.join(__dirname, '..', 'services'));

function readFileAsDataUrl(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (_) {
    return null;
  }
}

const ASSETS = path.join(__dirname, '..', '..', 'assets');
const ICONS = {};
for (const s of SERVICES) {
  const p = path.join(ASSETS, 'icons', `${s.id}.png`);
  ICONS[s.id] = readFileAsDataUrl(p);
}
const brandLogo = readFileAsDataUrl(path.join(ASSETS, 'officefl-logo.png'));

if (!brandLogo) {
  const alt = readFileAsDataUrl(path.join(ASSETS, '..', 'officefl-logo.png'));
  if (alt) globalThis.__officeBrandLogo = alt;
}

const electronAPI = {
  getConfig: () => ipcRenderer.invoke('get-config'),
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  getActiveProfile: () => ipcRenderer.invoke('get-active-profile'),
  getActiveService: () => ipcRenderer.invoke('get-active-service'),
  switchProfile: (profileId) => ipcRenderer.invoke('switch-profile', profileId),
  createProfile: (name) => ipcRenderer.invoke('create-profile', name),
  showNotification: (title, body, urgency) => {
    ipcRenderer.send('show-notification', { title, body, urgency });
  },
  playNotificationSound: (type) => {
    ipcRenderer.send('play-notification-sound', { type });
  },
  updateTray: (count, flash) => {
    ipcRenderer.send('tray-update', { count, flash });
  },
  setBadgeCount: (count) => {
    ipcRenderer.send('set-badge-count', count);
  },
  switchService: (serviceId) => {
    ipcRenderer.send('service-switch', serviceId);
  },
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  zoomIn: () => ipcRenderer.send('zoom-in'),
  zoomOut: () => ipcRenderer.send('zoom-out'),
  zoomReset: () => ipcRenderer.send('zoom-reset'),
  navigate: (url) => ipcRenderer.send('navigate', url),
  onServiceChanged: (callback) => {
    ipcRenderer.on('service-changed', (event, serviceId) => callback(serviceId));
  },
  onSystemThemeChanged: (callback) => {
    ipcRenderer.on('system-theme-changed', (event, theme) => callback(theme));
  },
  getServices: () => SERVICES,
  getServiceIcons: () => ICONS,
  getBrandLogo: () => brandLogo,
  chooseDesktopMedia: (options) => ipcRenderer.invoke('choose-desktop-media', options),
  onScreenSharingStarted: (callback) => {
    ipcRenderer.on('screen-sharing-started', (event, data) => callback(data));
  },
  onScreenSharingStopped: (callback) => {
    ipcRenderer.on('screen-sharing-stopped', (event, data) => callback(data));
  },
  sendLog: (message) => {
    ipcRenderer.send('renderer-log', message);
  },
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowMaximizeChange: (callback) => {
    ipcRenderer.on('window-maximize-change', (event, maximized) => callback(maximized));
  }
};

globalThis.electronAPI = electronAPI;

try {
  require(path.join(__dirname, 'tools'));
} catch (err) {
  console.warn('[Office] Failed to load browser tools:', err.message);
}

module.exports = electronAPI;