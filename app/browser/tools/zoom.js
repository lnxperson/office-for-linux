function initZoom() {
  document.addEventListener('keydown', (event) => {
    const ctrlOrCmd = event.ctrlKey || event.metaKey;
    if (!ctrlOrCmd) return;

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      window.electronAPI.zoomIn();
    } else if (event.key === '-') {
      event.preventDefault();
      window.electronAPI.zoomOut();
    } else if (event.key === '0') {
      event.preventDefault();
      window.electronAPI.zoomReset();
    }
  });
}

module.exports = { initZoom };