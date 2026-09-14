const { app, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');

const PROTOCOL = 'ms365';

class DeepLinkRouter {
  constructor() {
    this.handler = null;
  }

  register() {
    if (process.defaultApp && process.argv[1]) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient(PROTOCOL);
    }

    app.on('open-url', (event, url) => {
      event.preventDefault();
      this.handleUrl(url);
    });

    const initialUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (initialUrl) {
      this.handleUrl(initialUrl);
    }
  }

  setHandler(handler) {
    this.handler = handler;
  }

  handleUrl(url) {
    log.info(`Deep link received: ${url}`);

    try {
      const parsed = new URL(url);
      const route = parsed.hostname;

      if (this.handler) {
        this.handler(route, parsed);
      } else {
        log.warn(`No deep link handler set for ${route}`);
      }
    } catch (err) {
      log.error('Failed to parse deep link:', err);
    }
  }
}

module.exports = DeepLinkRouter;