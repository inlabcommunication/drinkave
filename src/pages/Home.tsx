import { BookOpen, Instagram, KeyRound, Martini, Mic, Newspaper, Wine } from 'lucide-react';
import { NotificheCard } from '../components/NotificheButton';
import { Ornament } from '../components/Ui';
import { backend } from '../lib/backend';
import { useAsync } from '../lib/useAsync';
import { formatData } from '../lib/util';

export default function Home() {
  const news = useAsync(async () => (await (await backend()).listNews()).slice(0, 2));

  return (
    <div className="wrap page">
      <section className="hero">
        <div className="badge-logo">
          <div className="frame">
            <h1>Drinkave</h1>
          </div>
          <div className="sub">Bere culturale</div>
        </div>
        <p className="tagline" style={{ marginTop: 22 }}>“Non tutti sanno dove siamo.”</p>
        <div className="eyebrow" style={{ marginTop: 6 }}>Speakeasy · Laterza</div>

        <nav className="highlights" aria-label="Scorciatoie">
          <a href="#/parola"><span className="ring"><KeyRound size={24} /></span>Parola</a>
          <a href="#/menu"><span className="ring"><Martini size={24} /></span>Drink</a>
          <a href="#/news"><span className="ring"><Wine size={24} /></span>Convivio</a>
          <a href="#/podcast"><span className="ring"><Mic size={24} /></span>Podcast</a>
        </nav>
      </section>

      <div className="grid2" style={{ marginTop: 26 }}>
        <a className="card link tile feature" href="#/parola">
          <KeyRound size={28} />
          <h3>Scopri la parola d’ordine</h3>
          <p>Questo posto non dovrebbe esistere. Iscriviti o accedi: senza la parola la porta resta chiusa.</p>
        </a>
        <a className="card link tile" href="#/menu">
          <BookOpen size={26} />
          <h3>Menu</h3>
          <p>Drink e degustazioni.</p>
        </a>
        <a className="card link tile" href="#/news">
          <Newspaper size={26} />
          <h3>News</h3>
          <p>Eventi, convivi, novità.</p>
        </a>
        <a className="card link tile" href="#/podcast" style={{ gridColumn: '1 / -1' }}>
          <Mic size={26} />
          <h3>Podcast</h3>
          <p>Guarda gli episodi senza uscire dall’app.</p>
        </a>
      </div>

      {news.data && news.data.length > 0 && (
        <>
          <Ornament label="ULTIME NOTIZIE" />
          <div className="stack">
            {news.data.map((n) => (
              <a key={n.id} className="card link" href={`#/news/${n.id}`}>
                <div className="meta">
                  {n.categoria ? `${n.categoria} · ` : ''}
                  {formatData(n.data)}
                </div>
                <h3 style={{ marginTop: 6 }}>{n.titolo}</h3>
                <p className="muted small" style={{ margin: '4px 0 0' }}>{n.sommario}</p>
              </a>
            ))}
          </div>
        </>
      )}

      <Ornament />
      <NotificheCard />
      <a className="card link insta" href="https://www.instagram.com/drinkave_bereculturale/" target="_blank" rel="noopener noreferrer" style={{ marginTop: 14 }}>
        <span className="ico"><Instagram size={24} /></span>
        <span>
          <strong style={{ display: 'block' }}>@drinkave_bereculturale</strong>
          <span className="muted small">Seguici su Instagram · prenotazioni in DM</span>
        </span>
      </a>
    </div>
  );
}
