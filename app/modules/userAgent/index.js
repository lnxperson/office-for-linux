const { app } = require('electron');
const log = require('electron-log');

const DEFAULT_WEBVIEW_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const MS365_UA = {
  outlook: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Outlook/1.0',
  teams: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Teams/1.0',
  office: DEFAULT_WEBVIEW_UA
};

class UserAgent {
  constructor(config) {
    this.config = config;
  }

  get(userAgent = 'office') {
    if (this.config.get('userAgent')) {
      return this.config.get('userAgent');
    }
    return MS365_UA[userAgent] || DEFAULT_WEBVIEW_UA;
  }

  apply() {
    if (this.config.get('userAgent')) {
      app.userAgentFallback = this.config.get('userAgent');
    } else {
      app.userAgentFallback = DEFAULT_WEBVIEW_UA;
      app.userAgentFallback = this.config.get('userAgent') || app.userAgentFallback;
    }
    log.info(`User agent: ${app.userAgentFallback}`);
  }
}

function set(config) {
  const ua = new UserAgent(config);
  ua.apply();
  return ua;
}

module.exports = UserAgent;
module.exports.set = set;
module.exports.MS365_UA = MS365_UA;