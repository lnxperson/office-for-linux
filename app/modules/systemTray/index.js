const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { SERVICES } = require('../../services');
const { assetPath } = require('../../utils/assets');

class SystemTray {
  constructor(config, mainWindow, profiles) {
    this.config = config;
    this.mainWindow = mainWindow;
    this.profiles = profiles;
    this.tray = null;
    this.badgeCount = 0;
    this.baseIcon = null;

    this.createTray();
  }

  createTray() {
    if (!this.config.get('trayIconEnabled')) {
      return;
    }

    const iconPath = assetPath('tray', 'tray.png');
    if (!fs.existsSync(iconPath)) {
      log.warn(`Tray icon not found: ${iconPath}`);
      return;
    }

    this.baseIcon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(this.baseIcon);
    this.tray.setToolTip('Office for Linux');

    this.tray.on('click', () => {
      this.mainWindow.toggle();
    });

    this.tray.on('right-click', () => {
      this.tray.popUpContextMenu(this.buildContextMenu());
    });

    this.updateContextMenu();
  }

  buildContextMenu() {
    const menuItems = [];
    const activeService = this.mainWindow.currentService;

    const servicesMenu = SERVICES.map((service) => ({
      label: service.name,
      type: 'radio' ,
      checked: activeService === service.id,
      click: () => {
        this.mainWindow.loadService(service.id);
      }
    }));

    menuItems.push({
      label: 'Open Office for Linux',
      click: () => this.mainWindow.show()
    });

    menuItems.push({ type: 'separator' });
    menuItems.push({ label: 'Services', submenu: servicesMenu });

    if (this.profiles) {
      const profiles = this.profiles.getAll();
      if (profiles.length > 1) {
        const profilesMenu = profiles.map((profile) => ({
          label: profile.name,
          type: 'radio',
          checked: this.profiles.getActive()?.id === profile.id,
          click: () => {
            this.profiles.switchTo(profile.id).then(() => {
              this.mainWindow.loadService(this.mainWindow.currentService || this.config.get('defaultService'));
            });
          }
        }));
        menuItems.push({ type: 'separator' });
        menuItems.push({ label: 'Profiles', submenu: profilesMenu });
      }
    }

    menuItems.push({ type: 'separator' });

    menuItems.push({
      label: 'Show / Hide',
      accelerator: 'Ctrl+Shift+M',
      click: () => this.mainWindow.toggle()
    });

    menuItems.push({
      label: this.config.get('closeToTray') ? 'Close to Tray (enabled)' : 'Close to Tray (disabled)',
      type: 'checkbox',
      checked: this.config.get('closeToTray'),
      click: (item) => {
        this.config.set('closeToTray', item.checked);
        this.updateContextMenu();
      }
    });

    menuItems.push({ type: 'separator' });
    menuItems.push({ label: 'Quit', click: () => app.quit() });

    return Menu.buildFromTemplate(menuItems);
  }

  updateContextMenu() {
    if (this.tray) {
      this.tray.setContextMenu(this.buildContextMenu());
    }
  }

  updateBadge(count, flash = false) {
    this.badgeCount = count;

    if (!this.tray) return;

    if (count > 0) {
      const badgeText = String(count);
      const icon = this.baseIcon.resize({ width: 16, height: 16 });
      const badge = nativeImage.createFromBuffer(Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <circle cx="8" cy="8" r="8" fill="#e51400"/>
          <text x="8" y="11" text-anchor="middle" font-size="${badgeText.length > 2 ? 6 : 9}" fill="white" font-family="Arial" font-weight="bold">${badgeText}</text>
        </svg>
      `));

      const composited = nativeImage.createEmpty();
      this.tray.setImage(this.composeIcon(icon, badge));

      if (flash) {
        this.tray.setTitle(String(count));
      }
    } else {
      this.tray.setImage(this.baseIcon);
      this.tray.setTitle('');
    }

    this.tray.setToolTip(this.badgeCount > 0
      ? `Office for Linux (${this.badgeCount})`
      : 'Office for Linux');

    if (this.mainWindow && this.mainWindow.window && process.platform !== 'darwin') {
      this.mainWindow.window.setOverlayIcon(
        count > 0 ? this.baseIcon : null,
        count > 0 ? `Office for Linux (${count})` : ''
      );
    }
  }

  composeIcon(base, badge) {
    const baseSize = base.getSize();
    const badgeSize = badge.getSize();
    const canvas = Buffer.alloc(baseSize.width * baseSize.height * 4);

    const baseBmp = base.toBitmap();
    const badgeBmp = badge.toBitmap();

    for (let i = 0; i < baseBmp.length; i++) {
      canvas[i] = baseBmp[i];
    }

    const offsetX = baseSize.width - badgeSize.width;
    const offsetY = 0;
    for (let y = 0; y < badgeSize.height; y++) {
      for (let x = 0; x < badgeSize.width; x++) {
        const srcIdx = (y * badgeSize.width + x) * 4;
        const dstIdx = ((y + offsetY) * baseSize.width + (x + offsetX)) * 4;
        const alpha = badgeBmp[srcIdx + 3] / 255;
        for (let c = 0; c < 4; c++) {
          canvas[dstIdx + c] = Math.round(
            badgeBmp[srcIdx + c] * alpha + canvas[dstIdx + c] * (1 - alpha)
          );
        }
      }
    }

    return nativeImage.createFromBitmap(canvas, { width: baseSize.width, height: baseSize.height });
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = SystemTray;