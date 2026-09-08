// preload.js
// Ponte segura entre a tela (React, sem acesso direto ao sistema) e o
// processo principal do Electron (que tem acesso ao sistema operacional).
// contextIsolation está ativado (em main.js), então o front só pode usar
// exatamente o que a gente decide expor aqui — nada além disso.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Pede pro processo principal abrir a pasta de imagens do produto no
  // Explorer/Finder do sistema.
  abrirPastaImagensProduto: (produtoId) => ipcRenderer.invoke('abrir-pasta-imagens-produto', produtoId),
});
