const { app, BrowserWindow } = require('electron');
const sms = require('./sms');

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    kiosk: false
  })

  win.loadFile('index.html');
  win.on('ready-to-show', ()=> {
    win.show();
    sms.initMessageInterval(win);
  });
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  sms.disableMessages();
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
})