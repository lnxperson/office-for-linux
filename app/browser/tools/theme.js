function initTheme() {
  if (window.matchMedia) {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = (dark) => {
      const root = document.documentElement;
      root.style.colorScheme = dark ? 'dark' : 'light';
    };

    apply(darkQuery.matches);
    darkQuery.addEventListener('change', (e) => apply(e.matches));
  }

  if (window.electronAPI.onSystemThemeChanged) {
    window.electronAPI.onSystemThemeChanged((theme) => {
      document.documentElement.style.colorScheme = theme;
    });
  }
}

module.exports = { initTheme };