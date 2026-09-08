import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [totais, setTotais] = useState({ clientes: 0, grupos: 0, campanhas: 0 });

  useEffect(() => {
    async function carregar() {
      const [clientes, grupos, campanhas] = await Promise.all([
        api.listarClientes(),
        api.listarGrupos(),
        api.listarCampanhas(),
      ]);
      setTotais({ clientes: clientes.length, grupos: grupos.length, campanhas: campanhas.length });
    }
    carregar();
  }, []);

  return (
    <div>
      <h1>Visão geral</h1>
      <div className="cards-metricas">
        <div className="card-metrica">
          <p>Clientes</p>
          <strong>{totais.clientes}</strong>
        </div>
        <div className="card-metrica">
          <p>Grupos ativos</p>
          <strong>{totais.grupos}</strong>
        </div>
        <div className="card-metrica">
          <p>Campanhas criadas</p>
          <strong>{totais.campanhas}</strong>
        </div>
      </div>
    </div>
  );
}
