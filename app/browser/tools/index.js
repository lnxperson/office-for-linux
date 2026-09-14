const sidebar = require('./sidebar');
const zoom = require('./zoom');
const theme = require('./theme');
const titleObserver = require('./titleObserver');

function init() {
  if (!window.electronAPI) {
    console.warn('[Office] electronAPI not available, tools not loaded');
    return;
  }

  const onReady = () => {
    try {
      sidebar.initSidebar();
    } catch (err) {
      console.warn('[Office] Sidebar init failed:', err);
    }

    try {
      theme.initTheme();
    } catch (err) {
      console.warn('[Office] Theme init failed:', err);
    }

    try {
      titleObserver.initialize();
    } catch (err) {
      console.warn('[Office] TitleObserver init failed:', err);
    }
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    onReady();
  } else {
    document.addEventListener('DOMContentLoaded', onReady);
  }

  try {
    zoom.initZoom();
  } catch (err) {
    console.warn('[Office] Zoom init failed:', err);
  }
}

if (typeof window !== 'undefined') {
  init();
}

module.exports = { init };