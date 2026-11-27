import { Instagram, KeyRound, Martini, Mic, Wine } from 'lucide-react';
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
        <div className="hero-card">
          <img className="hero-logo" src="/logo-drinkave.webp" alt="Drinkave · Bere culturale" width="240" height="93" />
          <p className="tagline">“Non tutti sanno dove siamo.”</p>
          <div className="eyebrow" style={{ marginTop: 6, color: 'var(--gold)' }}>Speakeasy · Laterza</div>
          <a className="btn hero-cta" href="#/parola">
            <KeyRound size={16} /> Scopri la parola d’ordine
          </a>
          <p className="small" style={{ margin: '14px 0 0', color: '#d9b9a8', letterSpacing: '.04em' }}>Questo posto non dovrebbe esistere.</p>
        </div>

        <nav className="highlights" aria-label="Sezioni">
          <a href="#/menu"><span className="ring"><Martini size={22} /></span>Drink</a>
          <a href="#/news"><span className="ring"><Wine size={22} /></span>Convivio</a>
          <a href="#/podcast"><span className="ring"><Mic size={22} /></span>Podcast</a>
          <a href="https://www.instagram.com/drinkave_bereculturale/" target="_blank" rel="noopener noreferrer"><span className="ring"><Instagram size={22} /></span>Instagram</a>
        </nav>
      </section>

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
