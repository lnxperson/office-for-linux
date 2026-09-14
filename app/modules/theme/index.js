const { nativeTheme } = require('electron');
const log = require('electron-log');

const CSS_DARK = `
  :root {
    color-scheme: dark;
  }
  html, body {
    background-color: #1b1b1b !important;
  }
`;

const CSS_LIGHT = `
  :root {
    color-scheme: light;
  }
`;

class ThemeManager {
  constructor(config) {
    this.config = config;
  }

  getTheme() {
    const theme = this.config.get('theme') || 'system';
    if (theme === 'system') {
      return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    }
    return theme;
  }

  apply() {
    const theme = this.getTheme();
    nativeTheme.themeSource = theme === 'system' ? 'system' : theme;
    log.info(`Applied theme: ${theme}`);
  }

  setTheme(theme) {
    this.config.set('theme', theme);
    this.apply();
  }

  getCss() {
    const theme = this.getTheme();
    const custom = this.config.get('customCSS') || '';
    return (theme === 'dark' ? CSS_DARK : CSS_LIGHT) + '\n' + custom;
  }

  getDarkMode() {
    return this.getTheme() === 'dark';
  }
}

module.exports = ThemeManager;