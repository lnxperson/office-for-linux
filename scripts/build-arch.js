#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT, 'package.json'), 'utf8'));
const version = pkg.version;
const name = 'ms365-linux';
const arch = 'x86_64';
const epoch = Math.floor(Date.now() / 1000);

const unpackedDir = path.join(PROJECT, 'dist', 'linux-unpacked');
if (!fs.existsSync(unpackedDir)) {
  console.error('Unpacked app not found. Run `npm run build` first.');
  process.exit(1);
}

const pkgDir = path.join(PROJECT, 'dist', 'arch-pkg');
fs.rmSync(pkgDir, { recursive: true, force: true });

const dirs = [
  'usr/bin',
  'usr/share/ms365-linux',
  'usr/share/applications',
  'usr/share/icons/hicolor/16x16/apps',
  'usr/share/icons/hicolor/24x24/apps',
  'usr/share/icons/hicolor/32x32/apps',
  'usr/share/icons/hicolor/48x48/apps',
  'usr/share/icons/hicolor/64x64/apps',
  'usr/share/icons/hicolor/128x128/apps',
  'usr/share/icons/hicolor/256x256/apps',
  'usr/share/icons/hicolor/512x512/apps'
];
dirs.forEach((d) => fs.mkdirSync(path.join(pkgDir, d), { recursive: true }));

console.log('Copying app files...');
execSync(`cp -r "${unpackedDir}"/* "${path.join(pkgDir, 'usr/share/ms365-linux')}/"`);

const wrapperScript = `#!/bin/sh
exec /usr/share/ms365-linux/ms365-linux "$@"
`;
fs.writeFileSync(path.join(pkgDir, 'usr/bin/ms365-linux'), wrapperScript);
fs.chmodSync(path.join(pkgDir, 'usr/bin/ms365-linux'), 0o755);

const desktopFile = `[Desktop Entry]
Name=MS365 for Linux
Comment=Unofficial Microsoft 365 desktop client
Exec=/usr/share/ms365-linux/ms365-linux %U
Icon=ms365-linux
Type=Application
Categories=Office;
Keywords=office;365;word;excel;powerpoint;onedrive;onenote;
MimeType=x-scheme-handler/ms365;
StartupWMClass=ms365-linux
`;
fs.writeFileSync(path.join(pkgDir, 'usr/share/applications/ms365-linux.desktop'), desktopFile);

const iconDir = path.join(PROJECT, 'dist', '.icon-set');
if (fs.existsSync(iconDir)) {
  for (const size of ['16x16','24x24','32x32','48x48','64x64','128x128','256x256','512x512']) {
    const iconFile = path.join(iconDir, `icon_${size}.png`);
    const destDir = path.join(pkgDir, `usr/share/icons/hicolor/${size}/apps`);
    if (fs.existsSync(iconFile)) {
      fs.copyFileSync(iconFile, path.join(destDir, 'ms365-linux.png'));
    }
  }
}

const makedeps = "'nodejs' 'npm'";
const optdeps = "'libnotify: Desktop notifications' 'libappindicator-gtk3: System tray support' 'libxcrypt-compat: libcrypt.so.1 for Electron'";

const PKGINFO = `# Maintainer: lnxperson <lnxperson@users.noreply.github.com>
pkgname = ${name}
pkgver = ${version}-1
pkgdesc = Unofficial Microsoft 365 desktop client for Linux
url = https://github.com/lnxperson/ms365-for-linux
arch = ${arch}
license = GPL3
depends = glibc
depends = libnotify
depends = nss
depends = libxss
depends = libxtst
depends = libgbm
depends = alsa-lib
depends = xdg-utils
makedepends = ${makedeps}
optdepends = ${optdeps}
provides = ${name}
conflicts = ${name}
options = !strip
size = 0
builddate = ${epoch}
packager = lnxperson <lnxperson@users.noreply.github.com>
`;

fs.writeFileSync(path.join(pkgDir, '.PKGINFO'), PKGINFO);

const BUILDINFO = `# Created by makepkg
# $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# $(which makepkg || echo "manual")
# 0
`;

fs.writeFileSync(path.join(pkgDir, '.BUILDINFO'), BUILDINFO);

const outputTar = path.join(PROJECT, 'dist', `${name}-${version}-1-${arch}.pkg.tar.zst`);

console.log(`Creating ${path.basename(outputTar)}...`);
try {
  execSync(
    `tar --use-compress-program='zstd -T0 -19 -c' --no-acls --no-xattrs -C "${pkgDir}" -cf "${outputTar}" .`,
    { stdio: 'inherit' }
  );
} catch (err) {
  console.error('zstd tar failed. Is zstd installed?', err.message);
  process.exit(1);
}

const size = fs.statSync(outputTar).size;
console.log(`\nArch package created: ${outputTar} (${(size / 1024 / 1024).toFixed(1)} MB)`);
console.log('\nTo install:');
console.log(`  sudo pacman -U ${outputTar}`);
