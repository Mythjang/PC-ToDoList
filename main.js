const { app, BrowserWindow, Menu, Tray, ipcMain, dialog } = require('electron');
const path = require('path');
const AutoLaunch = require('auto-launch');

let mainWindow;
let tray;
let dialogWindow = null;
let isAlwaysOnTop = false;

// 开机启动配置
const autoLauncher = new AutoLaunch({
  name: 'Desktop Todo',
  path: app.getPath('exe')
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    minWidth: 200,
    minHeight: 150,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // 开发时打开开发者工具
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 防止窗口被意外关闭，最小化到托盘
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: '隐藏',
      click: () => {
        mainWindow.hide();
      }
    },
    {
      type: 'separator'
    },
    {
      label: '置顶',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: () => {
        isAlwaysOnTop = !isAlwaysOnTop;
        mainWindow.setAlwaysOnTop(isAlwaysOnTop);
      }
    },
    {
      type: 'separator'
    },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Desktop Todo');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 事件处理
ipcMain.handle('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  return isAlwaysOnTop;
});

ipcMain.handle('get-always-on-top', () => {
  return isAlwaysOnTop;
});

ipcMain.handle('minimize-window', () => {
  mainWindow.hide();
});

ipcMain.handle('close-window', () => {
  app.isQuiting = true;
  app.quit();
});

// 开机启动相关
ipcMain.handle('get-auto-launch', async () => {
  try {
    return await autoLauncher.isEnabled();
  } catch (error) {
    return false;
  }
});

ipcMain.handle('set-auto-launch', async (event, enabled) => {
  try {
    if (enabled) {
      await autoLauncher.enable();
    } else {
      await autoLauncher.disable();
    }
    return true;
  } catch (error) {
    console.error('Auto launch error:', error);
    return false;
  }
});

// 创建对话框窗口
ipcMain.handle('open-todo-dialog', (event, todoData) => {
  if (dialogWindow) {
    dialogWindow.focus();
    return;
  }

  dialogWindow = new BrowserWindow({
    width: 450,
    height: 500,
    parent: mainWindow,
    modal: false,
    show: false,
    resizable: true,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  dialogWindow.loadFile('dialog.html');
  
  dialogWindow.once('ready-to-show', () => {
    dialogWindow.show();
    if (todoData) {
      dialogWindow.webContents.send('load-todo-data', todoData);
    }
  });

  dialogWindow.on('closed', () => {
    dialogWindow = null;
  });
});

ipcMain.handle('close-todo-dialog', () => {
  if (dialogWindow) {
    dialogWindow.close();
  }
});

ipcMain.handle('save-todo-from-dialog', (event, todoData) => {
  mainWindow.webContents.send('todo-saved', todoData);
  if (dialogWindow) {
    dialogWindow.close();
  }
});

// 保存和加载待办事项数据
const fs = require('fs');
const userDataPath = app.getPath('userData');
const todosPath = path.join(userDataPath, 'todos.json');

ipcMain.handle('save-bookmarks', (event, todos) => {
  try {
    fs.writeFileSync(todosPath, JSON.stringify(todos, null, 2));
    return true;
  } catch (error) {
    console.error('Save todos error:', error);
    return false;
  }
});

ipcMain.handle('load-bookmarks', () => {
  try {
    if (fs.existsSync(todosPath)) {
      const data = fs.readFileSync(todosPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Load todos error:', error);
    return [];
  }
});

// 保存和加载设置
const settingsPath = path.join(userDataPath, 'settings.json');

ipcMain.handle('save-settings', (event, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Save settings error:', error);
    return false;
  }
});

ipcMain.handle('load-settings', () => {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
    return {
      backgroundColor: '#ffffff',
      opacity: 0.9,
      fontSize: 14
    };
  } catch (error) {
    console.error('Load settings error:', error);
    return {
      backgroundColor: '#ffffff',
      opacity: 0.9,
      fontSize: 14
    };
  }
});