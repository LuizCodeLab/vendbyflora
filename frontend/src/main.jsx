import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

// Usamos HashRouter (em vez de BrowserRouter) porque, dentro do Electron,
// o app não roda num servidor web de verdade — HashRouter evita problemas
// de navegação quando o app for empacotado como .exe/.app.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
