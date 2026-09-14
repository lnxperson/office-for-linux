# MS365 for Linux

Unofficial Microsoft 365 desktop client for Linux. Electron-based wrapper around the
M365 web applications (Word, Excel, PowerPoint, OneDrive, OneNote) with full Linux
desktop environment integration.

> **Not affiliated with Microsoft.** This is an independent, open-source project.

## Features

- **Multi-service:** Word, Excel, PowerPoint, OneDrive, OneNote in one app with a sidebar switcher
- **System tray:** badge count, quick service switching, show/hide
- **Native notifications:** Linux notification daemon integration with sound
- **Multi-profile:** multiple Microsoft accounts with isolated sessions
- **D-Bus:** launcher entry integration, notification support detection
- **Global shortcuts:** toggle window, switch services (configurable)
- **Auto-start:** XDG autostart support
- **Themes:** light / dark / system theme
- **Screen sharing:** WebRTC desktop capture for meetings
- **Deep links:** `ms365://` protocol handler
- **Download manager:** progress tracking, open-when-done
- **Proxy support:** manual or automatic proxy configuration
- **Custom CSS & user agent**

## Installation

### Quick start (development)

```bash
npm install
npm start
```

### Build packages

```bash
npm run build:all        # .deb, .rpm, and .pkg.tar.zst (Arch)
```

Or individually:

```bash
npm run build:deb        # Debian/Ubuntu .deb
npm run build:rpm        # Fedora/RHEL/SUSE .rpm
npm run build:arch       # Arch Linux .pkg.tar.zst (requires makepkg)
```

## Configuration

Configuration is read from `~/.config/ms365-linux/config.json` (user) and
`/etc/ms365-linux/config.json` (system-wide). User config overrides system config.

See `config.example.json` for all options.

### CLI arguments

| Flag | Description |
|------|-------------|
| `--start-full-screen` | Start in full screen |
| `--start-minimized` | Start minimized to tray |
| `--close-to-tray` / `--no-close-to-tray` | Close button behavior |
| `--tray-icon` / `--no-tray-icon` | Enable/disable tray icon |
| `--disable-notifications` | Disable all notifications |
| `--default-service <id>` | Default service: word, excel, powerpoint, onedrive, onenote |
| `--theme <light\|dark\|system>` | App theme |
| `--zoom-factor <number>` | Zoom factor between 0.5 and 3.0 |
| `--user-agent <string>` | Custom user agent |
| `--proxy <url>` | Proxy server |
| `--disable-gpu` | Disable GPU acceleration |

## Development

```bash
npm install
npm run lint
npm start
```

### Building on Fedora

electron-builder's bundled `fpm` needs two system tools:

```bash
# deb builds: libcrypt.so.1 for the bundled ruby runtime
dnf install libxcrypt-compat

# rpm builds: rpmbuild
dnf install rpm-build
```

Set `PATH` and `LD_LIBRARY_PATH` if libxcrypt-compat is not in the system library
path (e.g. only available via `dnf download` + `cpio` extraction):

```bash
export LD_LIBRARY_PATH=/path/to/libxcrypt:${LD_LIBRARY_PATH}
export PATH=/path/to/rpmbuild/bin:${PATH}
npm run build:all
```

## Project structure

```
app/
├── index.js                   # Electron main process entry
├── appConfiguration/          # Config loading (yargs + config.json)
├── mainAppWindow/             # BrowserWindow management & service loading
├── browser/
│   ├── preload.js             # Preload script (electronAPI)
│   └── tools/                 # Injected browser tools (sidebar, zoom, theme, ...)
├── modules/
│   ├── notifications/         # Native notifications + sounds
│   ├── systemTray/            # Tray icon, badge, context menu
│   ├── profiles/              # Multi-account profiles
│   ├── dbus/                  # D-Bus integration
│   ├── autoStart/             # XDG autostart
│   ├── userAgent/             # UA string management
│   ├── globalShortcuts/       # Global keyboard shortcuts
│   ├── screenSharing/         # WebRTC screen capture
│   ├── theme/                 # Theme management
│   ├── deepLink/              # ms365:// protocol handler
│   └── downloads/             # Download management
└── services/                  # M365 service definitions
```

## License

GPL-3.0-only