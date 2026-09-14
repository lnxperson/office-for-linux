const path = require('path');

const SERVICES = [
  {
    id: 'word',
    name: 'Word',
    url: 'https://word.office.com',
    urls: ['https://word.office.com', 'https://word-edit.officeapps.live.com'],
    icon: path.join(__dirname, '..', '..', '..', 'assets', 'icons', 'word.png'),
    color: '#2b579a',
    description: 'Word documents'
  },
  {
    id: 'excel',
    name: 'Excel',
    url: 'https://excel.office.com',
    urls: ['https://excel.office.com', 'https://excel-edit.officeapps.live.com'],
    icon: path.join(__dirname, '..', '..', '..', 'assets', 'icons', 'excel.png'),
    color: '#217346',
    description: 'Excel spreadsheets'
  },
  {
    id: 'powerpoint',
    name: 'PowerPoint',
    url: 'https://powerpoint.office.com',
    urls: ['https://powerpoint.office.com', 'https://powerpoint-edit.officeapps.live.com'],
    icon: path.join(__dirname, '..', '..', '..', 'assets', 'icons', 'powerpoint.png'),
    color: '#b7472a',
    description: 'PowerPoint presentations'
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    url: 'https://onedrive.live.com',
    urls: ['https://onedrive.live.com', 'https://onedrive.live.com'],
    icon: path.join(__dirname, '..', '..', '..', 'assets', 'icons', 'onedrive.png'),
    color: '#0078d4',
    description: 'Cloud file storage'
  },
  {
    id: 'onenote',
    name: 'OneNote',
    url: 'https://onenote.office.com',
    urls: ['https://onenote.office.com', 'https://www.onenote.com'],
    icon: path.join(__dirname, '..', '..', '..', 'assets', 'icons', 'onenote.png'),
    color: '#7719aa',
    description: 'Notes and notebooks'
  }
];

function getService(id) {
  return SERVICES.find((s) => s.id === id);
}

module.exports = { SERVICES, getService };