const { app, ipcMain, session, nativeTheme, BrowserWindow } = require('electron');
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
const ProfileManagerWindow = require('./modules/profileManager');

log.transports.file.level = 'info';
log.transports.console.level = 'info';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow = null;
  let tray = null;
  const config = AppConfiguration.load();

  const relaxCsp = (details, callback) => {
    const headers = { ...details.responseHeaders };
    delete headers['content-security-policy'];
    delete headers['Content-Security-Policy'];
    callback({
      responseHeaders: {
        ...headers,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;"
        ]
      }
    });
  };

  const applyCspRelaxation = (targetSession) => {
    targetSession.webRequest.onHeadersReceived(relaxCsp);
  };

  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
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

    applyCspRelaxation(session.defaultSession);

    const profiles = new ProfilesManager(config);
    await profiles.initialize();

    const activeProfile = profiles.getActive();
    const sessionPartition = activeProfile ? activeProfile.partition : config.get('partition');
    applyCspRelaxation(session.fromPartition(sessionPartition));

    const notificationService = new NotificationService(config);
    const screenSharingService = new ScreenSharingService();
    const downloadManager = new DownloadManager(config);
    const themeManager = new ThemeManager(config);
    const deepLinkRouter = new DeepLinkRouter();
    const dbusService = new DbusService();
    const autoStart = new AutoStart(config);
    const profileManagerWindow = new ProfileManagerWindow();

    await dbusService.initialize();

    mainWindow = new MainAppWindow(config, {
      profiles,
      notificationService,
      screenSharingService,
      downloadManager,
      themeManager,
      dbusService,
      initialPartition: sessionPartition
    });

    tray = new SystemTray(config, mainWindow, profiles);
    mainWindow.setTray(tray);

    downloadManager.attachToSession(session.fromPartition(sessionPartition));
    downloadManager.setMainWindow(mainWindow);

    let flushed = false;
    app.on('before-quit', (event) => {
      if (flushed) return;
      event.preventDefault();
      flushed = true;
      if (mainWindow) {
        mainWindow.quitting = true;
      }
      try {
        const partition = profiles.getActive() ? profiles.getActive().partition : config.get('partition');
        const result = session.fromPartition(partition).flushStorageData();
        if (result && typeof result.then === 'function') {
          result.then(() => app.quit()).catch(() => app.quit());
          return;
        }
      } catch (err) {
        log.warn('Failed to flush session storage:', err);
      }
      app.quit();
    });

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
      dbusService,
      profileManagerWindow
    });

    log.info('Application started successfully');
  });

  function registerIpcHandlers(deps) {
    const { config, mainWindow, profiles, notificationService, tray, themeManager, dbusService, downloadManager, profileManagerWindow } = deps;

    const isProfileSignedIn = async (partition) => {
      try {
        const cookies = await session.fromPartition(partition).cookies.get({});
        return cookies.some((c) => {
          const domain = (c.domain || '').toLowerCase();
          if (!domain.includes('live.com') && !domain.includes('microsoft')) return false;
          const name = (c.name || '').toLowerCase();
          return ['estsauth', 'msaauth', 'signinstatecookie', 'ssocookie', 'signinname'].some((k) => name.includes(k));
        });
      } catch (_) {
        return false;
      }
    };

    ipcMain.handle('get-config', () => {
      return config.getAll();
    });

    ipcMain.handle('get-profiles', () => {
      return profiles.getAll();
    });

    ipcMain.handle('get-active-profile', () => {
      return profiles.getActive();
    });

    ipcMain.handle('get-active-service', () => {
      return mainWindow ? mainWindow.currentService : config.get('defaultService');
    });

    ipcMain.on('navigate', (event, url) => {
      if (mainWindow) {
        mainWindow.navigate(url);
      }
    });

    ipcMain.handle('create-profile', (event, name) => {
      const profile = profiles.createProfile(name || `Profile ${profiles.getAll().length + 1}`);
      return profile;
    });

    ipcMain.on('open-profile-manager', () => {
      profileManagerWindow.open();
    });

    ipcMain.handle('get-profile-status', async () => {
      const active = profiles.getActive();
      const list = [];
      for (const p of profiles.getAll()) {
        list.push({
          id: p.id,
          name: p.name,
          isActive: !!(active && active.id === p.id),
          signedIn: await isProfileSignedIn(p.partition)
        });
      }
      return list;
    });

    const loginWindows = new Map();

    ipcMain.handle('sign-in-profile', async (event, profileId) => {
      const profile = profiles.getAll().find((p) => p.id === profileId);
      if (!profile) return { ok: false, error: 'Profile not found' };

      const partition = profile.partition;
      const existing = loginWindows.get(partition);
      if (existing && !existing.isDestroyed()) {
        existing.show();
        existing.focus();
        return { ok: true, opened: false };
      }

      applyCspRelaxation(session.fromPartition(partition));
      downloadManager.attachToSession(session.fromPartition(partition));

      const loginWindow = new BrowserWindow({
        width: 520,
        height: 680,
        show: false,
        title: `Sign in — ${profile.name}`,
        backgroundColor: '#ffffff',
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(__dirname, 'browser', 'preload.js'),
          contextIsolation: false,
          nodeIntegration: false,
          sandbox: false,
          partition
        }
      });

      loginWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://') || url.startsWith('http://')) {
          loginWindow.loadURL(url);
        }
        return { action: 'deny' };
      });

      loginWindows.set(partition, loginWindow);

      const poll = setInterval(async () => {
        if (loginWindow.isDestroyed()) {
          clearInterval(poll);
          loginWindows.delete(partition);
          return;
        }
        if (await isProfileSignedIn(partition)) {
          clearInterval(poll);
          loginWindows.delete(partition);
          if (!loginWindow.isDestroyed()) loginWindow.destroy();
          profileManagerWindow.refresh();
        }
      }, 1500);

      loginWindow.on('closed', () => {
        clearInterval(poll);
        if (loginWindows.get(partition) === loginWindow) loginWindows.delete(partition);
        profileManagerWindow.refresh();
      });

      loginWindow.once('ready-to-show', () => loginWindow.show());

      await loginWindow.loadURL('https://login.live.com');
      return { ok: true, opened: true };
    });

    ipcMain.handle('sign-out-profile', async (event, profileId) => {
      const profile = profiles.getAll().find((p) => p.id === profileId);
      if (!profile) return { ok: false, error: 'Profile not found' };
      const partition = profile.partition;
      const login = loginWindows.get(partition);
      if (login && !login.isDestroyed()) {
        login.destroy();
        loginWindows.delete(partition);
      }
      try {
        await session.fromPartition(partition).clearStorageData();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    });

    ipcMain.handle('remove-profile', async (event, profileId) => {
      const removedActive = profiles.getActive() && profiles.getActive().id === profileId;
      try {
        profiles.deleteProfile(profileId);
      } catch (err) {
        return { ok: false, error: err.message };
      }
      if (removedActive) {
        const active = profiles.getActive();
        const partition = active ? active.partition : config.get('partition');
        const targetSession = session.fromPartition(partition);
        targetSession.webRequest.onHeadersReceived(relaxCsp);
        mainWindow.reloadWithProfile(partition);
        downloadManager.attachToSession(targetSession);
      }
      return { ok: true };
    });

    ipcMain.handle('switch-profile', async (event, profileId) => {
      await profiles.switchTo(profileId);
      const profile = profiles.getActive();
      const partition = profile ? profile.partition : config.get('partition');
      const targetSession = session.fromPartition(partition);
      targetSession.webRequest.onHeadersReceived(relaxCsp);
      mainWindow.reloadWithProfile(partition);
      downloadManager.attachToSession(targetSession);
    });

    ipcMain.on('show-notification', (event, { title, body, urgency }) => {
      notificationService.show(title, body, urgency);
    });

    ipcMain.on('renderer-log', (event, message) => {
      log.info(`[Renderer] ${message}`);
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

    ipcMain.on('window-minimize', () => {
      if (mainWindow && mainWindow.window) mainWindow.window.minimize();
    });

    ipcMain.on('window-maximize', () => {
      if (!mainWindow || !mainWindow.window) return;
      if (mainWindow.window.isMaximized()) {
        mainWindow.window.unmaximize();
      } else {
        mainWindow.window.maximize();
      }
    });

    ipcMain.on('window-close', () => {
      if (mainWindow && mainWindow.window) mainWindow.window.close();
    });

    ipcMain.handle('window-is-maximized', () => {
      return mainWindow && mainWindow.window ? mainWindow.window.isMaximized() : false;
    });

    if (mainWindow && mainWindow.window) {
      mainWindow.window.on('maximize', () => {
        mainWindow.send('window-maximize-change', true);
      });
      mainWindow.window.on('unmaximize', () => {
        mainWindow.send('window-maximize-change', false);
      });
    }

    nativeTheme.on('updated', () => {
      if (mainWindow && mainWindow.window) {
        mainWindow.window.webContents.send('system-theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
      }
    });
  }
}
