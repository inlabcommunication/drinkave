import { BookOpen, CalendarDays, Home as HomeIcon, UserRound, Wine } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Loading } from './components/Ui';
import { DEMO } from './lib/config';
import { useRoute } from './lib/router';
import Home from './pages/Home';
import MenuPage from './pages/MenuPage';
import NewsPage from './pages/News';
import AreaPage from './pages/Area';
import BottigliePage from './pages/Bottiglie';
import PrenotaPage from './pages/Prenota';
import PodcastPage from './pages/Podcast';
import { useCliente } from './lib/useCliente';
import Privacy from './pages/Privacy';

const AdminApp = lazy(() => import('./admin/AdminApp'));

const tabs = [
  { id: '', label: 'Home', icon: HomeIcon },
  { id: 'menu', label: 'Menu', icon: BookOpen },
  { id: 'prenota', label: 'Prenota', icon: CalendarDays },
  { id: 'bottiglie', label: 'Bottiglie', icon: Wine },
  { id: 'area', label: 'Profilo', icon: UserRound, key: true },
];

export default function App() {
  const [sezione = '', sub] = useRoute();
  const admin = sezione === 'gestione';
  const cliente = useCliente();
  const attiva = sezione === 'parola' ? 'area' : sezione;

  let pagina;
  switch (sezione) {
    case 'menu': pagina = <MenuPage />; break;
    case 'parola':
    case 'area': pagina = <AreaPage />; break;
    case 'bottiglie': pagina = <BottigliePage id={sub} />; break;
    case 'prenota': pagina = <PrenotaPage sezione={sub} />; break;
    case 'news': pagina = <NewsPage id={sub} />; break;
    case 'podcast': pagina = <PodcastPage />; break;
    case 'privacy': pagina = <Privacy />; break;
    case 'gestione': pagina = <AdminApp sezione={sub ?? ''} />; break;
    default: pagina = <Home />;
  }

  return (
    <>
      {DEMO && <div className="demo-banner">Modalità demo · i dati restano solo in questo browser</div>}
      <header className="topbar">
        <div className="wrap">
          <a className="brand" href="#/" aria-label="Drinkave, home"><img className="brand-logo" src="/logo-drinkave.webp" alt="Drinkave · Bere culturale" width="88" height="34" /></a>
          {!admin && (
            <a className="area-btn" href="#/area" aria-label={cliente ? `La tua area, ${cliente.nome}` : 'Accedi o registrati'}>
              <UserRound size={16} /> {cliente ? cliente.nome : 'Accedi'}
            </a>
          )}
        </div>
      </header>

      <main>
        <Suspense fallback={<div className="wrap page"><Loading /></div>}>{pagina}</Suspense>
      </main>

      {!admin && (
        <nav className="bottomnav" aria-label="Navigazione principale">
          <ul>
            {tabs.map((t) => (
              <li key={t.id}>
                <a href={`#/${t.id}`} className={t.key ? 'key' : undefined} aria-current={attiva === t.id ? 'page' : undefined}>
                  <t.icon size={21} strokeWidth={attiva === t.id ? 2.2 : 1.6} />
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
