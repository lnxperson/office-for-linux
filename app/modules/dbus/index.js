const { app } = require('electron');
const dbus = require('dbus-native');
const log = require('electron-log');

const DBUS_SERVICE_NAME = 'com.ms365.linux';
const DBUS_OBJECT_PATH = '/com/ms365/linux';

class DbusService {
  constructor() {
    this.bus = null;
    this.serviceName = null;
    this.currentBadgeCount = 0;
    this.capabilities = {};
  }

  async initialize() {
    try {
      this.bus = dbus.sessionBus();
      this.checkCapabilities();
      log.info('D-Bus session bus connected');
    } catch (err) {
      log.warn('D-Bus initialization failed (this is non-critical):', err.message);
      this.bus = null;
    }
  }

  checkCapabilities() {
    if (!this.bus) return;

    const notify = this.bus.getService('org.freedesktop.Notifications');
    notify.getInterface('/org/freedesktop/Notifications', 'org.freedesktop.DBus.Introspectable', (err, iface) => {
      this.capabilities.notifications = !err;
    });

    const unity = this.bus.getService('com.canonical.Unity');
    unity.getInterface('/com/canonical/Unity', 'com.canonical.Unity.LauncherEntry', (err, iface) => {
      this.capabilities.unityLauncherEntry = !err;
      if (!err) {
        this.setBadgeCount(0);
      }
    });

    const kde = this.bus.getService('org.kde.JobViewServer');
    this.capabilities.kdeJobView = Boolean(kde);
  }

  setBadgeCount(count) {
    this.currentBadgeCount = count;

    if (!this.bus) return;

    if (this.capabilities.unityLauncherEntry) {
      const unity = this.bus.getService('com.canonical.Unity');
      const iface = unity.getInterface('/com/canonical/Unity', 'com.canonical.Unity.LauncherEntry', (err, iface) => {
        if (err || !iface) return;
        iface.SetProperty('application/ms365-linux', {
          'unity:launcher': {
            quicklist: [],
            progress: 0,
            urgent: count > 0 ? true : false
          }
        });
      });
    }

    if (this.capabilities.kdeJobView) {
      // KDE JobView badges are handled by Electron's native taskbar integration
      app.setBadgeCount ? app.setBadgeCount(count) : null;
    }
  }
}

module.exports = DbusService;