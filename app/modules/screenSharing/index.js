const { desktopCapturer } = require('electron');
const { ipcMain } = require('electron');
const log = require('electron-log');

class ScreenSharingService {
  constructor() {
    this.currentStream = null;
    this.setupIpc();
  }

  setupIpc() {
    ipcMain.handle('choose-desktop-media', async (event, options = {}) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 320, height: 180 },
          fetchWindowIcons: true
        });

        return sources.map((source) => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail.toDataURL(),
          type: source.id.startsWith('screen') ? 'screen' : 'window'
        }));
      } catch (err) {
        log.error('Failed to list desktop media sources:', err);
        throw err;
      }
    });

    ipcMain.on('screen-sharing-started', (event, { sourceId }) => {
      log.info('Screen sharing started:', sourceId);
    });

    ipcMain.on('screen-sharing-stopped', (event) => {
      log.info('Screen sharing stopped');
    });
  }

  handleStream(channel, args) {
    if (channel === 'desktopCapturer:getSources') {
      return this.getSources();
    }
    return null;
  }
}

module.exports = ScreenSharingService;