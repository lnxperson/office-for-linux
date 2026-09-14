let observer = null;
let lastCount = 0;

function extractUnreadCount(title) {
  const patterns = [
    /^\((\d+)\)/,
    /\((\d+)\)/,
    /(\d+) unread/,
    /(\d+) new/
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 0;
}

function initialize() {
  observer = new MutationObserver(() => {
    const title = document.title;
    const count = extractUnreadCount(title);

    if (count !== lastCount) {
      lastCount = count;

      if (window.electronAPI.updateTray) {
        window.electronAPI.updateTray(count, count > 0);
      }
      if (window.electronAPI.setBadgeCount) {
        window.electronAPI.setBadgeCount(count);
      }
    }
  });

  observer.observe(document.querySelector('title'), {
    subtree: true,
    childList: true,
    characterData: true
  });

  const initialCount = extractUnreadCount(document.title);
  if (initialCount > 0) {
    lastCount = initialCount;
    if (window.electronAPI.updateTray) {
      window.electronAPI.updateTray(initialCount, true);
    }
  }
}

module.exports = { initialize, extractUnreadCount };