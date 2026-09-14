const fs = require('fs');
const os = require('os');
const path = require('path');
const log = require('electron-log');

class AutoStart {
  constructor(config) {
    this.config = config;
    this.autostartDir = path.join(os.homedir(), '.config', 'autostart');
    this.desktopFile = path.join(this.autostartDir, 'office-for-linux.desktop');
  }

  isEnabled() {
    return this.config.get('autoStart') === true || this.config.get('autoStart') === 'true';
  }

  apply() {
    if (this.isEnabled()) {
      this.enable();
    }
  }

  enable() {
    try {
      if (!fs.existsSync(this.autostartDir)) {
        fs.mkdirSync(this.autostartDir, { recursive: true });
      }

      const execPath = process.env.APP_IMAGE || process.execPath;

      const content = `[Desktop Entry]
Type=Application
Version=1.0
Name=Office for Linux
Comment=Start Microsoft 365 client at login
Exec="${execPath}" %U
Icon=office-for-linux
Hidden=false
X-GNOME-Autostart-enabled=true
`;

      fs.writeFileSync(this.desktopFile, content);
      log.info(`Auto-start enabled: ${this.desktopFile}`);
    } catch (err) {
      log.error('Failed to enable auto-start:', err.message);
    }
  }

  disable() {
    try {
      if (fs.existsSync(this.desktopFile)) {
        fs.rmSync(this.desktopFile);
        log.info('Auto-start disabled');
      }
    } catch (err) {
      log.error('Failed to disable auto-start:', err.message);
    }
  }
}

module.exports = AutoStart;