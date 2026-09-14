const path = require('path');
const fs = require('fs');
const yargs = require('yargs');
const log = require('electron-log');

const DEFAULT_CONFIG = {
  startFullScreen: false,
  startMinimized: false,
  closeToTray: true,
  trayIconEnabled: true,
  disableNotifications: false,
  disableNotificationSound: false,
  disableNotificationWindowFlash: false,
  defaultService: 'word',
  theme: 'system',
  zoomFactor: 1.0,
  userAgent: '',
  customCSS: '',
  autoUpdate: true,
  proxy: '',
  partition: 'persist:office-for-linux',
  windowWidth: 1280,
  windowHeight: 800,
  windowMinWidth: 800,
  windowMinHeight: 600,
  disableGpu: false,
  spellcheckLanguages: ['en-US']
};

class AppConfiguration {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.configPath = null;
  }

  static load() {
    const instance = new AppConfiguration();
    instance.loadFromArgs();
    instance.loadFromFile();
    instance.applyOverrides();
    return instance;
  }

  loadFromArgs() {
    const argv = yargs
      .usage('Usage: $0 [options]')
      .option('close-to-tray', { type: 'boolean', describe: 'Close to system tray', default: undefined })
      .option('start-minimized', { type: 'boolean', describe: 'Start minimized', default: undefined })
      .option('start-full-screen', { type: 'boolean', describe: 'Start in full screen', default: undefined })
      .option('tray-icon', { type: 'boolean', describe: 'Enable tray icon', default: undefined })
      .option('disable-notifications', { type: 'boolean', describe: 'Disable notifications', default: undefined })
      .option('disable-notification-sound', { type: 'boolean', describe: 'Disable notification sounds', default: undefined })
      .option('default-service', { type: 'string', describe: 'Default M365 service to load', default: undefined })
      .option('theme', { type: 'string', describe: 'Theme (light, dark, system)', default: undefined })
      .option('zoom-factor', { type: 'number', describe: 'Zoom factor (0.5 - 3.0)', default: undefined })
      .option('user-agent', { type: 'string', describe: 'Custom user agent string', default: undefined })
      .option('proxy', { type: 'string', describe: 'Proxy server URL', default: undefined })
      .option('disable-gpu', { type: 'boolean', describe: 'Disable GPU acceleration', default: undefined })
      .option('no-sandbox', { type: 'boolean', describe: 'Disable Electron sandbox', default: false })
      .help('h')
      .alias('h', 'help')
      .parseSync();

    for (const [key, value] of Object.entries(argv)) {
      if (value !== undefined && key !== '_' && key !== '$0' && key !== 'h' && key !== 'help') {
        const configKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.config[configKey] = value;
      }
    }
  }

  loadFromFile() {
    const configDirs = [
      path.join(require('electron').app.getPath('home'), '.config', 'office-for-linux'),
      path.join('/etc', 'office-for-linux')
    ];

    for (const dir of configDirs) {
      const configFile = path.join(dir, 'config.json');
      try {
        if (fs.existsSync(configFile)) {
          const fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
          this.config = { ...this.config, ...fileConfig };
          this.configPath = configFile;
          log.info(`Loaded config from ${configFile}`);
        }
      } catch (err) {
        log.error(`Failed to load config from ${configFile}:`, err.message);
      }
    }

    if (!this.configPath) {
      const userConfigDir = path.join(require('electron').app.getPath('home'), '.config', 'office-for-linux');
      this.configPath = path.join(userConfigDir, 'config.json');
    }
  }

  applyOverrides() {
    if (this.config.disableGpu) {
      require('electron').app.disableHardwareAcceleration();
    }

    if (this.config.proxy) {
      require('electron').session.defaultSession.setProxy({
        pacScript: this.config.proxy === 'auto' ? 'auto://' : undefined,
        proxyRules: this.config.proxy !== 'auto' ? this.config.proxy : undefined
      });
    }
  }

  get(key) {
    return this.config[key];
  }

  getAll() {
    return { ...this.config };
  }

  set(key, value) {
    this.config[key] = value;
    this.save();
  }

  save() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (err) {
      log.error('Failed to save config:', err.message);
    }
  }
}

module.exports = AppConfiguration;
