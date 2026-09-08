import { NavLink } from 'react-router-dom';

const itens = [
  { caminho: '/', rotulo: 'Dashboard' },
  { caminho: '/clientes', rotulo: 'Clientes' },
  { caminho: '/grupos', rotulo: 'Grupos' },
  { caminho: '/produtos', rotulo: 'Produtos' },
  { caminho: '/campanhas', rotulo: 'Campanhas' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">VendByFlora</div>
      <nav>
        {itens.map((item) => (
          <NavLink
            key={item.caminho}
            to={item.caminho}
            end={item.caminho === '/'}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' ativo' : '')}
          >
            {item.rotulo}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
