const { ipcRenderer } = require('electron');

globalThis.electronAPI = {
  getProfiles: () => ipcRenderer.invoke('get-profile-status'),
  createProfile: (name) => ipcRenderer.invoke('create-profile', name),
  switchProfile: (profileId) => ipcRenderer.invoke('switch-profile', profileId),
  attachAccount: (profileId) => ipcRenderer.invoke('attach-account', profileId),
  detachAccount: (profileId) => ipcRenderer.invoke('detach-account', profileId),
  removeProfile: (profileId) => ipcRenderer.invoke('remove-profile', profileId)
};