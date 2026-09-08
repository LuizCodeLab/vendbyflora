// main.js
// Este é o "coração" do app desktop. O Electron usa este arquivo pra abrir
// a janela do programa e, ao mesmo tempo, ligar nosso servidor local (Express).

const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Inicia o backend Express + SQLite (tudo local, sem internet).
require('./backend/server');
const { PASTA_IMAGENS } = require('./backend/db');

// Abre no Explorer (Windows) / Finder (Mac) a pasta com todas as fotos do
// produto, pra selecionar todas de uma vez e arrastar pro WhatsApp — já
// que a área de transferência do sistema só carrega uma imagem por vez.
ipcMain.handle('abrir-pasta-imagens-produto', (_evento, produtoId) => {
  const pastaProduto = path.join(PASTA_IMAGENS, `produto-${produtoId}`);
  if (!fs.existsSync(pastaProduto)) {
    fs.mkdirSync(pastaProduto, { recursive: true });
  }
  return shell.openPath(pastaProduto);
});

function criarJanela() {
  Menu.setApplicationMenu(null);

  const janela = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'VendByFlora',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  // Toda vez que um link tentar abrir uma nova janela (ex: whatsapp://),
  // deixa o Windows decidir o que abrir, em vez do Electron criar uma
  // janela própria em branco.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    janela.loadURL('http://localhost:5173');
  } else {
    janela.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  criarJanela();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
