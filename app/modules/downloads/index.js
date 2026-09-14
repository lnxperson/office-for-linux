const { app, dialog, shell, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');

class DownloadManager {
  constructor(config, mainWindow = null) {
    this.config = config;
    this.mainWindow = mainWindow;
    this.activeDownloads = new Map();
    this.setupListeners();
  }

  setMainWindow(mainWindow) {
    this.mainWindow = mainWindow;
  }

  setupListeners() {
    ipcMain.on('download-feedback', (event, details) => {
      if (details.type === 'completed') {
        this.onDownloadComplete(details);
      }
    });
  }

  onDownloadComplete(details) {
    if (this.mainWindow && this.mainWindow.window) {
      this.mainWindow.window.webContents.send('download-complete', details);
    }

    if (this.config.get('openDownloadsWhenDone')) {
      if (details.path && fs.existsSync(details.path)) {
        shell.openPath(path.dirname(details.path));
      }
    }
  }

  attachToSession(sess) {
    if (!sess) return;

    sess.on('will-download', (event, item) => {
      const totalBytes = item.getTotalBytes();
      const filePath = item.getSavePath();

      item.on('updated', (event, state) => {
        if (state === 'progressing') {
          const received = item.getReceivedBytes();
          if (this.mainWindow && this.mainWindow.window) {
            this.mainWindow.window.webContents.send('download-progress', {
              id: item.getSavePath(),
              received,
              total: totalBytes,
              percent: totalBytes > 0 ? Math.round((received / totalBytes) * 100) : 0
            });
          }
        }
      });

      item.on('done', (event, state) => {
        if (state === 'completed') {
          this.onDownloadComplete({ path: filePath, state: 'completed' });
          log.info(`Download completed: ${filePath}`);
        } else {
          log.warn(`Download ${state}: ${filePath}`);
        }
      });
    });
  }
}

module.exports = DownloadManager;