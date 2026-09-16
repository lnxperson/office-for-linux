const { ipcRenderer } = require('electron');

globalThis.electronAPI = {
  getProfiles: () => ipcRenderer.invoke('get-profile-status'),
  createProfile: (name) => ipcRenderer.invoke('create-profile', name),
  switchProfile: (profileId) => ipcRenderer.invoke('switch-profile', profileId),
  signInProfile: (profileId) => ipcRenderer.invoke('sign-in-profile', profileId),
  signOutProfile: (profileId) => ipcRenderer.invoke('sign-out-profile', profileId),
  removeProfile: (profileId) => ipcRenderer.invoke('remove-profile', profileId),
  onProfilesUpdated: (callback) => {
    ipcRenderer.on('profiles-updated', () => callback());
  }
};