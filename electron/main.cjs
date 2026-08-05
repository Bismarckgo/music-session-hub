const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { createDawWatcher } = require('./daw-watcher.cjs');

const APP_URL = process.env.CST_APP_URL || 'https://id-preview--d182a654-6351-4e12-9c5e-2abcc2ecd744.lovable.app';

let watcher = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'CST — Credit Session Track',
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadURL(APP_URL);
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  watcher = createDawWatcher({
    dataDir: app.getPath('userData'),
    appUrl: process.env.CST_INGEST_URL || APP_URL,
    onStatus: (s) => console.log('[CST watcher]', JSON.stringify(s)),
  });
  watcher.start();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (watcher) watcher.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
