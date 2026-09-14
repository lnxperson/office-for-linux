const { Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const log = require('electron-log');
const { assetPath } = require('../../utils/assets');

class NotificationService {
  constructor(config) {
    this.config = config;
    this.onClick = null;
  }

  show(title, body, urgency = 'normal') {
    if (this.config.get('disableNotifications')) {
      log.debug('Notifications disabled, skipping');
      return;
    }

    if (!Notification.isSupported()) {
      return;
    }

    const iconPath = assetPath('icons', 'icon.png');
    const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

    const notification = new Notification({
      title,
      body,
      icon,
      urgency,
      timeoutType: 'default',
      silent: true
    });

    notification.on('click', () => {
      if (this.onClick) {
        this.onClick();
      }
    });

    notification.show();
  }

  setClickHandler(callback) {
    this.onClick = callback;
  }

  playSound(type = 'message') {
    if (this.config.get('disableNotificationSound')) {
      return;
    }

    const soundFile = type === 'meeting'
      ? 'meeting_started.wav'
      : 'new_message.wav';
    const soundPath = assetPath('sounds', soundFile);

    if (!fs.existsSync(soundPath)) {
      log.debug(`Sound file not found: ${soundPath}`);
      return;
    }

    this.playViaSystemPlayer(soundPath);
  }

  playViaSystemPlayer(soundPath) {
    const candidates = [
      { cmd: 'paplay', args: [soundPath] },
      { cmd: 'aplay', args: ['-q', soundPath] },
      { cmd: 'ffplay', args: ['-nodisp', '-autoexit', '-loglevel', 'quiet', soundPath] }
    ];

    const tryPlayer = (index) => {
      if (index >= candidates.length) {
        log.warn('No system audio player available to play notification sound');
        return;
      }

      const { cmd, args } = candidates[index];
      const proc = spawn(cmd, args, { stdio: 'ignore' });

      proc.on('error', () => {
        tryPlayer(index + 1);
      });

      proc.on('exit', (code) => {
        if (code !== 0) {
          tryPlayer(index + 1);
        }
      });
    };

    tryPlayer(0);
  }
}

module.exports = NotificationService;