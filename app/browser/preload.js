const { ipcRenderer, webFrame, shell } = require('electron');
const { SERVICES } = require('../services');

const electronAPI = {
  getConfig: () => ipcRenderer.invoke('get-config'),
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  getActiveProfile: () => ipcRenderer.invoke('get-active-profile'),
  getActiveService: () => ipcRenderer.invoke('get-active-service'),
  switchProfile: (profileId) => ipcRenderer.invoke('switch-profile', profileId),
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
  openExternal: (url) => shell.openExternal(url),
  chooseDesktopMedia: (options) => ipcRenderer.invoke('choose-desktop-media', options),
  onScreenSharingStarted: (callback) => {
    ipcRenderer.on('screen-sharing-started', (event, data) => callback(data));
  },
  onScreenSharingStopped: (callback) => {
    ipcRenderer.on('screen-sharing-stopped', (event, data) => callback(data));
  }
};

globalThis.electronAPI = electronAPI;

try {
  require('./tools');
} catch (err) {
  console.warn('[Office] Failed to load browser tools:', err.message);
}

module.exports = electronAPI;