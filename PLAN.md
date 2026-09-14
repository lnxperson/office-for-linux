# Office for Linux — Project Plan

## Overview

An unofficial Microsoft 365 desktop client for Linux, built with Electron. Wraps the M365 web applications (Word, Excel, PowerPoint, OneDrive, OneNote) in a native desktop shell with full Linux desktop environment integration. Inspired by and architecturally similar to [teams-for-linux](https://github.com/IsmaelMartinez/teams-for-linux).

## Architecture

### Core Concept

Single Electron app with a **service switcher sidebar** that loads different M365 web apps in the same `BrowserWindow`. Each service runs at its own URL on `office.com` / `onedrive.live.com`. Session cookies are preserved across service switches so the user stays authenticated.

### Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Electron 43+ | Latest stable, matches teams-for-linux |
| Config | yargs + electron-store | CLI args + persistent config.json |
| Logging | electron-log | Structured logging, file output |
| Updater | electron-updater | Auto-update via GitHub releases |
| Window state | electron-window-state | Remember size/position |
| Packaging | electron-builder | AppImage, deb, rpm, snap, flatpak |
| D-Bus | dbus-native | Linux desktop IPC (launcher entry, notifications) |

### Process Model

```
┌─────────────────────────────────────────────┐
│                Main Process                  │
│  app/index.js                                │
│  ├── AppConfiguration (yargs + config.json)  │
│  ├── MainAppWindow (BrowserWindow + sidebar) │
│  ├── NotificationService (native + sound)    │
│  ├── SystemTray (icon + badge + menu)        │
│  ├── ProfilesManager (multi-account)         │
│  ├── DownloadManager                         │
│  ├── ScreenSharingService                    │
│  ├── GlobalShortcuts                         │
│  ├── AutoStart (XDG)                         │
│  ├── DbusService (launcher entry, etc.)      │
│  ├── ThemeManager (light/dark)               │
│  ├── DeepLinkRouter (office:// protocol)      │
│  └── AutoUpdater                             │
├─────────────────────────────────────────────┤
│             Preload Script                    │
│  app/browser/preload.js                      │
│  Exposes: globalThis.electronAPI             │
│  ├── get-config                              │
│  ├── show-notification / play-sound          │
│  ├── tray-update / set-badge-count           │
│  ├── zoom / navigation                       │
│  ├── service-switch                          │
│  ├── profile-switch                          │
│  └── download handling                       │
├─────────────────────────────────────────────┤
│            Renderer Process                   │
│  (M365 web app + injected sidebar UI)        │
│  app/browser/tools/                          │
│  ├── sidebar.js (service switcher)           │
│  ├── zoom.js                                 │
│  ├── shortcuts.js                            │
│  ├── theme.js                                │
│  └── titleObserver.js (badge count)          │
└─────────────────────────────────────────────┘
```

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-config` | Renderer → Main | Fetch app configuration |
| `show-notification` | Renderer → Main | Display native notification |
| `play-notification-sound` | Renderer → Main | Play alert sound |
| `tray-update` | Renderer → Main | Update tray icon/badge |
| `set-badge-count` | Renderer → Main | Set taskbar badge count |
| `service-switch` | Renderer → Main | Switch active M365 service |
| `profile-switch` | Renderer → Main | Switch user profile |
| `zoom-*` | Renderer → Main | Zoom in/out/reset |
| `navigate` | Renderer → Main | URL navigation |
| `download-started` | Main → Renderer | Download event |
| `screen-sharing-*` | Bidirectional | Screen share lifecycle |
| `user-status-changed` | Renderer → Main | Presence update |

## M365 Services

### Initial Services (v1.0)

| Service | URL | Icon |
|---------|-----|------|
| Word | https://word.office.com | word.svg |
| Excel | https://excel.office.com | excel.svg |
| PowerPoint | https://powerpoint.office.com | powerpoint.svg |
| OneDrive | https://onedrive.live.com | onedrive.svg |
| OneNote | https://onenote.office.com | onenote.svg |

### Future Services (post v1.0)

- Microsoft Teams (teams.microsoft.com)
- Outlook (outlook.office.com)
- SharePoint (configurable URL)
- Microsoft Planner
- Microsoft To Do

## Module Details

### 1. App Configuration (`app/appConfiguration/`)

- `index.js` — Loads config from CLI args (yargs) + `~/.config/office-for-linux/config.json`
- Supports: `/etc/office-for-linux/config.json` (system-wide) + user config (overrides)
- Config options documented in CONFIG.md

### 2. Main App Window (`app/mainAppWindow/`)

- `index.js` — Creates and manages the BrowserWindow
- `browserWindowManager.js` — Window creation, state persistence, fullscreen handling
- `serviceLoader.js` — Loads M365 service URLs, manages service state
- `sidebarManager.js` — Injects and manages the service switcher sidebar

### 3. Service Switcher Sidebar

Injected via preload script. Renders a vertical sidebar on the left with:
- Service icons (Word, Excel, PowerPoint, OneDrive, OneNote)
- Active service indicator
- Profile avatar/selector at bottom
- Settings gear icon
- Collapsible (icon-only mode)

### 4. Browser Integration (`app/browser/`)

- `preload.js` — Exposes `electronAPI` to renderer, loads tool modules
- `tools/sidebar.js` — Service switcher DOM injection
- `tools/zoom.js` — Zoom controls
- `tools/shortcuts.js` — Keyboard shortcut handling
- `tools/theme.js` — Theme detection and application
- `tools/titleObserver.js` — MutationObserver for badge count extraction

### 5. Notifications (`app/modules/notifications/`)

- Native Linux notifications via Electron's `Notification` API
- Custom notification sounds (meeting, message, mail)
- Notification click → focus window
- Configurable: disable notifications, sounds, window flash

### 6. System Tray (`app/modules/systemTray/`)

- Tray icon with unread badge count
- Click to show/hide window
- Right-click context menu (services, profiles, settings, quit)
- Badge count tooltip
- Desktop-environment-aware (KStatusNotifierItem for KDE, SNI for others)

### 7. Multi-Profile (`app/modules/profiles/`)

- Multiple Microsoft account support
- Separate session partitions per profile
- Profile switcher in sidebar
- Profile-specific config (name, avatar, default service)

### 8. D-Bus Integration (`app/modules/dbus/`)

- Freedesktop.org notifications (org.freedesktop.Notifications)
- Launcher entry with badge count (org.freedesktop.Unity.LauncherEntry)
- Application status (org.freedesktop.Application)

### 9. Auto-Start (`app/modules/autoStart/`)

- XDG autostart .desktop file management
- Enable/disable via config or UI

### 10. User Agent (`app/modules/userAgent/`)

- Spoof as regular Chrome/Firefox on Linux
- Prevent Microsoft from showing "unsupported browser" warnings
- Configurable UA string

### 11. Global Shortcuts (`app/modules/globalShortcuts/`)

- Configurable global keyboard shortcuts
- Default: toggle window, switch service, screenshot

### 12. Screen Sharing (`app/modules/screenSharing/`)

- WebRTC screen sharing via desktopCapturer
- Window/screen picker dialog
- Permission handling

### 13. Theme Manager (`app/modules/theme/`)

- Light/dark/system theme support
- Follows desktop environment theme
- Custom CSS injection for M365 web apps

### 14. Deep Linking (`app/modules/deepLink/`)

- `office://` protocol registration
- Handle links like `office://word/documentid`
- Route to correct service

### 15. Download Manager (`app/modules/downloads/`)

- Download progress tracking
- Save file dialog
- Open when done option

## Directory Structure

```
Office for Linux/
├── PLAN.md                          # This file
├── package.json                     # Electron project config
├── electron-builder.yml             # Build/packaging config
├── app/
│   ├── index.js                     # Main process entry point
│   ├── appConfiguration/
│   │   └── index.js                 # Config loader (yargs + electron-store)
│   ├── mainAppWindow/
│   │   ├── index.js                 # Window management
│   │   ├── browserWindowManager.js  # BrowserWindow creation
│   │   ├── serviceLoader.js         # M365 service URL loading
│   │   └── sidebarManager.js        # Sidebar injection
│   ├── browser/
│   │   ├── preload.js               # Preload script
│   │   └── tools/
│   │       ├── sidebar.js           # Service switcher UI
│   │       ├── zoom.js              # Zoom controls
│   │       ├── shortcuts.js         # Keyboard shortcuts
│   │       ├── theme.js             # Theme detection
│   │       └── titleObserver.js     # Badge count from title
│   ├── modules/
│   │   ├── notifications/
│   │   │   └── service.js           # Native notifications
│   │   ├── systemTray/
│   │   │   └── index.js             # Tray icon + menu
│   │   ├── profiles/
│   │   │   └── index.js             # Multi-account manager
│   │   ├── dbus/
│   │   │   └── index.js             # D-Bus integration
│   │   ├── autoStart/
│   │   │   └── index.js             # XDG autostart
│   │   ├── userAgent/
│   │   │   └── index.js             # UA string management
│   │   ├── globalShortcuts/
│   │   │   └── index.js             # Global keyboard shortcuts
│   │   ├── screenSharing/
│   │   │   └── index.js             # Screen share service
│   │   ├── theme/
│   │   │   └── index.js             # Theme manager
│   │   ├── deepLink/
│   │   │   └── index.js             # Protocol handler
│   │   └── downloads/
│   │       └── index.js             # Download manager
│   └── services/
│       └── index.js                 # Service definitions
├── assets/
│   ├── icons/
│   │   ├── icon.png                 # App icon (512x512)
│   │   ├── icon.svg                 # App icon vector
│   │   ├── word.svg                 # Word service icon
│   │   ├── excel.svg                # Excel service icon
│   │   ├── powerpoint.svg           # PowerPoint service icon
│   │   ├── onedrive.svg             # OneDrive service icon
│   │   └── onenote.svg              # OneNote service icon
│   ├── tray/
│   │   ├── tray.png                 # Default tray icon
│   │   ├── tray-alert.png           # Alert tray icon
│   │   └── tray-template.png        # macOS template icon
│   └── sounds/
│       ├── new_message.wav          # Message notification sound
│       └── meeting_started.wav      # Meeting notification sound
└── README.md                        # Project documentation
```

## Implementation Phases

### Phase 1: Project Scaffolding
1. Create `package.json` with Electron 43, electron-builder, yargs, electron-store, electron-log, electron-window-state
2. Create `electron-builder.yml` for AppImage/deb/rpm packaging
3. Create `app/index.js` main process entry point
4. Create `app/appConfiguration/index.js` config loader
5. Create `app/mainAppWindow/index.js` basic BrowserWindow
6. Create `app/browser/preload.js` minimal preload

### Phase 2: Service Loading & Sidebar
1. Create `app/services/index.js` — service definitions (URLs, names, icons)
2. Create `app/mainAppWindow/serviceLoader.js` — load service URLs
3. Create `app/browser/tools/sidebar.js` — inject sidebar UI
4. Create service icons in `assets/icons/`
5. Wire sidebar click → service switch via IPC

### Phase 3: Desktop Integration
1. Create `app/modules/systemTray/index.js` — tray icon, badge, menu
2. Create `app/modules/notifications/service.js` — native notifications
3. Create `app/modules/userAgent/index.js` — UA spoofing
4. Create `app/modules/autoStart/index.js` — XDG autostart
5. Create `app/modules/globalShortcuts/index.js` — keyboard shortcuts
6. Create `app/modules/dbus/index.js` — D-Bus launcher entry

### Phase 4: Multi-Profile
1. Create `app/modules/profiles/index.js` — profile management
2. Session partitioning per profile
3. Profile switcher UI in sidebar
4. Profile-specific configuration

### Phase 5: Advanced Features
1. Create `app/modules/screenSharing/index.js` — screen share
2. Create `app/modules/theme/index.js` — theme management
3. Create `app/modules/deepLink/index.js` — protocol handler
4. Create `app/modules/downloads/index.js` — download manager
5. Create `app/browser/tools/zoom.js`, `shortcuts.js`, `theme.js`, `titleObserver.js`

### Phase 6: Polish & Packaging
1. Create tray icon assets
2. Create notification sounds
3. Create `.desktop` file
4. Configure electron-builder for all package formats
5. Create README.md
6. Testing across GNOME, KDE, XFCE, Cinnamon

## Configuration Options (Initial)

```json
{
  "startFullScreen": false,
  "startMinimized": false,
  "closeToTray": true,
  "trayIconEnabled": true,
  "disableNotifications": false,
  "disableNotificationSound": false,
  "defaultService": "word",
  "theme": "system",
  "zoomFactor": 1.0,
  "userAgent": "",
  "customCSS": "",
  "autoUpdate": true,
  "proxy": "",
  "partition": "persist:office-for-linux"
}
```

## Key Differences from teams-for-linux

| Aspect | teams-for-linux | Office for Linux |
|--------|----------------|-----------------|
| Target | Microsoft Teams only | Full M365 suite |
| Service switching | N/A (single service) | Sidebar with 5+ services |
| URL | teams.microsoft.com | word/office.com, excel/office.com, etc. |
| Sidebar | No | Yes — service switcher |
| Profiles | Teams-specific | Cross-service profiles |
| Deep links | msteams:// | office:// |
| Default service | Teams | Word (configurable) |
