const { BrowserWindow } = require('electron');
const path = require('path');

class ProfileManagerWindow {
  constructor() {
    this.window = null;
  }

  open() {
    if (this.window && !this.window.isDestroyed()) {
      if (this.window.isMinimized()) this.window.restore();
      this.window.show();
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 480,
      height: 580,
      minWidth: 400,
      minHeight: 420,
      show: false,
      title: 'Profiles — Office for Linux',
      backgroundColor: '#171b22',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'browser', 'profileManager', 'preload.js'),
        contextIsolation: false,
        nodeIntegration: false,
        sandbox: false
      }
    });

    this.window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    this.window.loadFile(path.join(__dirname, '..', '..', 'browser', 'profileManager', 'index.html'));

    this.window.once('ready-to-show', () => this.window.show());
    this.window.on('closed', () => {
      this.window = null;
    });
  }
}

module.exports = ProfileManagerWindow;