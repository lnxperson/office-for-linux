const { BrowserWindow, session } = require('electron');
const path = require('path');
const electronWindowState = require('electron-window-state');
const log = require('electron-log');
const { SERVICES, getService } = require('../services');
const { assetPath } = require('../utils/assets');

class MainAppWindow {
  constructor(config, deps = {}) {
    this.config = config;
    this.deps = deps;
    this.window = null;
    this.currentService = null;
    this.tray = null;

    const initialPartition = deps.initialPartition || null;
    this.createWindow(initialPartition);
  }

  setTray(tray) {
    this.tray = tray;
  }

  createWindow(partitionOverride = null) {
    const partition = partitionOverride || this.config.get('partition');
    const winState = electronWindowState({
      defaultWidth: this.config.get('windowWidth'),
      defaultHeight: this.config.get('windowHeight'),
      minWidth: this.config.get('windowMinWidth'),
      minHeight: this.config.get('windowMinHeight')
    });

    const options = {
      width: winState.width,
      height: winState.height,
      minWidth: this.config.get('windowMinWidth'),
      minHeight: this.config.get('windowMinHeight'),
      x: winState.x,
      y: winState.y,
      show: false,
      title: 'Office for Linux',
      backgroundColor: '#1f2733',
      autoHideMenuBar: true,
      icon: assetPath('icons', 'icon.png'),
      webPreferences: {
        preload: path.join(__dirname, '..', 'browser', 'preload.js'),
        contextIsolation: false,
        nodeIntegration: false,
        partition,
        spellcheck: true,
        spellcheckLanguages: this.config.get('spellcheckLanguages'),
        enableBlinkFeatures: 'EnumerateDevices,ScreenCapture',
        backgroundThrottling: false
      }
    };

    this.window = new BrowserWindow(options);
    winState.manage(this.window);

    if (this.config.get('startFullScreen')) {
      this.window.setFullScreen(true);
    }

    this.window.once('ready-to-show', () => {
      if (!this.config.get('startMinimized')) {
        this.window.show();
      }
    });

    this.window.on('close', (event) => {
      if (this.config.get('closeToTray') && this.tray) {
        event.preventDefault();
        this.window.hide();
      }
    });

    this.window.on('page-title-updated', (event, title) => {
      event.preventDefault();
    });

    this.window.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) {
        return { action: 'allow', overrideBrowserWindowOptions: {
          show: false,
          webPreferences: {
            preload: path.join(__dirname, '..', 'browser', 'preload.js'),
            contextIsolation: false,
            nodeIntegration: false
          }
        }};
      }
      return { action: 'deny' };
    });

    this.window.webContents.on('did-navigate', (event, url) => {
      this.handleNavigation(url);
    });

    this.window.webContents.on('did-navigate-in-page', (event, url) => {
      this.handleNavigation(url);
    });

    this.loadService(this.config.get('defaultService'));
  }

  handleNavigation(url) {
    for (const service of SERVICES) {
      if (service.urls.some((u) => url.startsWith(u))) {
        if (this.currentService !== service.id) {
          this.currentService = service.id;
          if (this.deps.profiles) {
            this.deps.profiles.updateActivity(service.id, url);
          }
          this.window.webContents.send('service-changed', service.id);
          log.info(`Navigated to service: ${service.id}`);
        }
        break;
      }
    }
  }

  loadService(serviceId) {
    const service = getService(serviceId);
    if (!service) {
      log.error(`Unknown service: ${serviceId}`);
      return;
    }

    this.currentService = service.id;
    const url = this.deps.profiles ? this.deps.profiles.getServiceUrl(service.id) : service.url;

    log.info(`Loading service: ${service.id} -> ${url}`);
    this.window.loadURL(url);
    this.window.setTitle(`${service.name} — Office for Linux`);
  }

  show() {
    if (this.window.isMinimized()) {
      this.window.restore();
    }
    this.window.show();
    this.window.focus();
  }

  hide() {
    this.window.hide();
  }

  toggle() {
    if (this.window.isVisible()) {
      this.window.hide();
    } else {
      this.show();
    }
  }

  isVisible() {
    return this.window.isVisible();
  }

  zoomIn() {
    const level = this.window.webContents.getZoomFactor();
    this.window.webContents.setZoomFactor(Math.min(3.0, level + 0.1));
  }

  zoomOut() {
    const level = this.window.webContents.getZoomFactor();
    this.window.webContents.setZoomFactor(Math.max(0.5, level - 0.1));
  }

  zoomReset() {
    this.window.webContents.setZoomFactor(this.config.get('zoomFactor'));
  }

  send(channel, ...args) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, ...args);
    }
  }

  reloadWithProfile(partition) {
    const serviceId = this.currentService || this.config.get('defaultService');
    const wasVisible = this.window.isVisible();

    this.destroy();
    this.createWindow(partition);

    if (wasVisible) {
      this.show();
    }

    this.loadService(serviceId);
  }

  destroy() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
  }
}

module.exports = MainAppWindow;