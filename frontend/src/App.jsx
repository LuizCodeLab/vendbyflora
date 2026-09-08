import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Grupos from './pages/Grupos';
import Produtos from './pages/Produtos';
import Campanhas from './pages/Campanhas';

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/grupos" element={<Grupos />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/campanhas" element={<Campanhas />} />
        </Routes>
      </main>
    </div>
  );
}
