import { app, BrowserWindow, Menu, dialog } from 'electron';
import * as fs from 'fs';
declare const MAIN_WINDOW_WEBPACK_ENTRY: any;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

class BudgetWindow {
  file?: string;
  data: any;

  constructor(private browserWindow: BrowserWindow) {
    browserWindow.webContents.on('ipc-message', (event, channel, ...args) => {
      switch (channel) {
        case 'heres-your-data': {
          const [data] = args;
          this.data = data;
          break;
        }
      }
    });
  }

  makeNew() {
    this.file = undefined;
    this.data = undefined;
    this.browserWindow.webContents.send('opened-data', []);
  }

  show() {
    this.browserWindow.show();
  }

  async open() {
    const result = await dialog.showOpenDialog(this.browserWindow, {
      properties: ['openFile'],
    });
    if (result.filePaths.length === 0) return;

    const existing = Object.values(budgets).find(budget => (
      budget.file === result.filePaths[0]
    ));

    if (existing) {
      existing.show();
      return;
    }

    this.file = result.filePaths[0];

    const json = fs.readFileSync(this.file, 'utf-8');
    this.data = JSON.parse(json);

    this.browserWindow.webContents.send('opened-data', this.data);
  }

  async save() {
    if (!this.file) {
      const result = await dialog.showSaveDialog(this.browserWindow, {});
      if (!result.filePath) return;
      this.file = result.filePath;
    }

    fs.writeFileSync(this.file, JSON.stringify(this.data));
    this.browserWindow.webContents.send('clean-state');
  }
}

const budgets: { [id: string]: BudgetWindow } = {};

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: true
    },
  });

  budgets[mainWindow.id] = new BudgetWindow(mainWindow);

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.on('close', () => {
    delete budgets[mainWindow.id];
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.



const isMac = process.platform === 'darwin';

const menu = Menu.buildFromTemplate([
  // { role: 'appMenu' }
  // ...(isMac ? [{
  //   label: app.name,
  //   submenu: [
  //     { role: 'about' },
  //     { type: 'separator' },
  //     { role: 'services' },
  //     { type: 'separator' },
  //     { role: 'hide' },
  //     { role: 'hideothers' },
  //     { role: 'unhide' },
  //     { type: 'separator' },
  //     { role: 'quit' }
  //   ]
  // }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      {
        label: 'New',
        click: async (item, window, event) => {
          budgets[window.id].makeNew();
        },
        accelerator: 'CommandOrControl+N',
      },
      {
        label: 'New Window',
        click: createWindow,
        accelerator: 'CommandOrControl+Shift+N',
      },
      {
        label: 'Open',
        click: async (item, window, event) => {
          budgets[window.id].open();
        },
        accelerator: 'CommandOrControl+O',
      },
      {
        label: 'Save',
        click: async (item, window, even) => {
          budgets[window.id].save();
        },
        accelerator: 'CommandOrControl+S',
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ]
  },
  { role: 'editMenu' },
  // {
  //   label: 'Edit',
  //   submenu: [
  //     { role: 'undo' },
  //     { role: 'redo' },
  //     { type: 'separator' },
  //     { role: 'cut' },
  //     { role: 'copy' },
  //     { role: 'paste' },
  //     ...(isMac ? [
  //       { role: 'pasteAndMatchStyle' },
  //       { role: 'delete' },
  //       { role: 'selectAll' },
  //       { type: 'separator' },
  //       {
  //         label: 'Speech',
  //         submenu: [
  //           { role: 'startspeaking' },
  //           { role: 'stopspeaking' }
  //         ]
  //       }
  //     ] : [
  //         { role: 'delete' },
  //         { type: 'separator' },
  //         { role: 'selectAll' }
  //       ])
  //   ]
  // },
  { role: 'viewMenu' },
  // {
  //   label: 'View',
  //   submenu: [
  //     { role: 'reload' },
  //     { role: 'forcereload' },
  //     { role: 'toggledevtools' },
  //     { type: 'separator' },
  //     { role: 'resetzoom' },
  //     { role: 'zoomin' },
  //     { role: 'zoomout' },
  //     { type: 'separator' },
  //     { role: 'togglefullscreen' }
  //   ]
  // },
  { role: 'windowMenu' },
  // {
  //   label: 'Window',
  //   submenu: [
  //     { role: 'minimize' },
  //     { role: 'zoom' },
  //     ...(isMac ? [
  //       { type: 'separator' },
  //       { role: 'front' },
  //       { type: 'separator' },
  //       { role: 'window' }
  //     ] : [
  //         { role: 'close' }
  //       ])
  //   ]
  // },
  // {
  //   role: 'help',
  //   submenu: [
  //     {
  //       label: 'Learn More',
  //       click: async () => {
  //         const { shell } = require('electron')
  //         await shell.openExternal('https://electronjs.org')
  //       }
  //     }
  //   ]
  // }
]);
Menu.setApplicationMenu(menu);