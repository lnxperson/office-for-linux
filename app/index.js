const { app, ipcMain, session, nativeTheme } = require('electron');
const path = require('path');
const log = require('electron-log');
const AppConfiguration = require('./appConfiguration');
const MainAppWindow = require('./mainAppWindow');
const NotificationService = require('./modules/notifications/service');
const SystemTray = require('./modules/systemTray');
const ProfilesManager = require('./modules/profiles');
const DbusService = require('./modules/dbus');
const AutoStart = require('./modules/autoStart');
const UserAgent = require('./modules/userAgent');
const GlobalShortcuts = require('./modules/globalShortcuts');
const ScreenSharingService = require('./modules/screenSharing');
const ThemeManager = require('./modules/theme');
const DeepLinkRouter = require('./modules/deepLink');
const DownloadManager = require('./modules/downloads');

log.transports.file.level = 'info';
log.transports.console.level = 'info';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow = null;
  let tray = null;
  const config = AppConfiguration.load();

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.whenReady().then(async () => {
    app.setAppUserModelId('com.officeforlinux');

    UserAgent.set(config);

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;"
          ]
        }
      });
    });

    const profiles = new ProfilesManager(config);
    await profiles.initialize();

    const notificationService = new NotificationService(config);
    const screenSharingService = new ScreenSharingService();
    const downloadManager = new DownloadManager(config);
    const themeManager = new ThemeManager(config);
    const deepLinkRouter = new DeepLinkRouter();
    const dbusService = new DbusService();
    const autoStart = new AutoStart(config);

    await dbusService.initialize();

    mainWindow = new MainAppWindow(config, {
      profiles,
      notificationService,
      screenSharingService,
      downloadManager,
      themeManager,
      dbusService
    });

    tray = new SystemTray(config, mainWindow, profiles);
    mainWindow.setTray(tray);

    downloadManager.attachToSession(session.fromPartition(config.get('partition')));
    downloadManager.setMainWindow(mainWindow);

    notificationService.setClickHandler(() => {
      if (mainWindow) mainWindow.show();
    });

    const globalShortcuts = new GlobalShortcuts(config, mainWindow);

    deepLinkRouter.register();

    autoStart.apply();

    themeManager.apply();

    registerIpcHandlers({
      config,
      mainWindow,
      profiles,
      notificationService,
      screenSharingService,
      downloadManager,
      themeManager,
      tray,
      dbusService
    });

    log.info('Application started successfully');
  });

  function registerIpcHandlers(deps) {
    const { config, mainWindow, profiles, notificationService, tray, themeManager, dbusService } = deps;

    ipcMain.handle('get-config', () => {
      return config.getAll();
    });

    ipcMain.handle('get-profiles', () => {
      return profiles.getAll();
    });

    ipcMain.handle('get-active-profile', () => {
      return profiles.getActive();
    });

    ipcMain.handle('switch-profile', async (event, profileId) => {
      await profiles.switchTo(profileId);
      const profile = profiles.getActive();
      const partition = profile ? profile.partition : config.get('partition');
      mainWindow.reloadWithProfile(partition);
      downloadManager.attachToSession(session.fromPartition(partition));
    });

    ipcMain.on('show-notification', (event, { title, body, urgency }) => {
      notificationService.show(title, body, urgency);
    });

    ipcMain.on('play-notification-sound', (event, { type }) => {
      notificationService.playSound(type);
    });

    ipcMain.on('tray-update', (event, { count, flash }) => {
      tray.updateBadge(count, flash);
      dbusService.setBadgeCount(count);
    });

    ipcMain.on('set-badge-count', (event, count) => {
      tray.updateBadge(count, false);
      dbusService.setBadgeCount(count);
    });

    ipcMain.on('service-switch', (event, serviceId) => {
      mainWindow.loadService(serviceId);
    });

    ipcMain.on('theme-changed', (event, theme) => {
      themeManager.setTheme(theme);
    });

    nativeTheme.on('updated', () => {
      if (mainWindow && mainWindow.window) {
        mainWindow.window.webContents.send('system-theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
      }
    });
  }
}
