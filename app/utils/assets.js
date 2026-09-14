const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const IS_PACKAGED = app.isPackaged;
const RESOURCES_PATH = process.resourcesPath || PROJECT_ROOT;

function assetPath(...segments) {
  const devPath = path.join(PROJECT_ROOT, 'assets', ...segments);
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  return path.join(RESOURCES_PATH, ...segments);
}

function moduleAssetPath(...segments) {
  return assetPath(...segments);
}

module.exports = { assetPath, moduleAssetPath, IS_PACKAGED, PROJECT_ROOT, RESOURCES_PATH };