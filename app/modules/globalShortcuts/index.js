const { globalShortcut } = require('electron');
const log = require('electron-log');

const DEFAULT_SHORTCUTS = {
  toggleWindow: 'Ctrl+Shift+M',
  switchToWord: 'Ctrl+Shift+1',
  switchToExcel: 'Ctrl+Shift+2',
  switchToPowerPoint: 'Ctrl+Shift+3',
  switchToOneDrive: 'Ctrl+Shift+4',
  switchToOneNote: 'Ctrl+Shift+5'
};

class GlobalShortcuts {
  constructor(config, mainWindow) {
    this.config = config;
    this.mainWindow = mainWindow;
    this.shortcuts = { ...DEFAULT_SHORTCUTS };

    this.register();
  }

  register() {
    const userShortcuts = this.config.get('globalShortcuts');
    if (userShortcuts) {
      this.shortcuts = { ...this.shortcuts, ...userShortcuts };
    }

    this.bind('toggleWindow', () => this.mainWindow.toggle());
    this.bind('switchToWord', () => this.mainWindow.loadService('word'));
    this.bind('switchToExcel', () => this.mainWindow.loadService('excel'));
    this.bind('switchToPowerPoint', () => this.mainWindow.loadService('powerpoint'));
    this.bind('switchToOneDrive', () => this.mainWindow.loadService('onedrive'));
    this.bind('switchToOneNote', () => this.mainWindow.loadService('onenote'));
  }

  bind(name, callback) {
    const accelerator = this.shortcuts[name];
    if (!accelerator) return;

    const registered = globalShortcut.register(accelerator, callback);
    if (!registered) {
      log.warn(`Failed to register shortcut ${name}: ${accelerator}`);
    } else {
      log.info(`Registered shortcut ${name}: ${accelerator}`);
    }
  }

  unregister() {
    globalShortcut.unregisterAll();
  }
}

module.exports = GlobalShortcuts;