import { Errore, Loading } from '../components/Ui';
import type { Backend } from '../lib/backend';
import { useAsync } from '../lib/useAsync';
import { formatDataOra } from '../lib/util';

export default function Dashboard({ b }: { b: Backend }) {
  const { data, errore, ricarica } = useAsync(async () => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const [clienti, news, podcast, parola, menu, bottiglie, prenotazioni] = await Promise.all([
      b.listClienti(),
      b.listNews(true),
      b.listPodcast(true),
      b.getParolaAdmin(),
      b.getMenu(),
      b.listBottiglie(true),
      b.listPrenotazioni(oggi.getTime()),
    ]);
    const settimana = Date.now() - 7 * 86_400_000;
    return {
      clienti: clienti.length,
      nuovi: clienti.filter((c) => c.creato > settimana).length,
      marketing: clienti.filter((c) => c.consensoMarketing).length,
      news: news.length,
      podcast: podcast.length,
      voci: menu.categorie.reduce((n, c) => n + c.voci.length, 0),
      daConfermare: prenotazioni.filter((p) => p.stato === 'richiesta').length,
      prossime: prenotazioni.filter((p) => p.stato === 'confermata').length,
      bottiglieAperte: bottiglie.filter((x) => x.stato === 'aperta').length,
      bottiglieComplete: bottiglie.filter((x) => x.stato === 'completa').length,
      parola,
    };
  });

  if (errore) return <Errore testo={`Panoramica non disponibile: ${errore}`} onRiprova={ricarica} />;
  if (!data) return <Loading />;

  const box = (n: number | string, label: string, href: string, urgente = false) => (
    <a className={`card link${urgente ? ' urgente' : ''}`} href={href}>
      <div className="stat">{n}</div>
      <div className="muted small" style={{ marginTop: 6 }}>{label}</div>
    </a>
  );
  const daFare = data.daConfermare + data.bottiglieComplete;

  return (
    <div className="stack">
      <h2>Panoramica</h2>

      <div className="eyebrow">Da fare</div>
      {daFare === 0 ? (
        <div className="msg ok">Tutto in ordine: nessuna richiesta in attesa.</div>
      ) : (
        <div className="grid2">
          {data.daConfermare > 0 && box(data.daConfermare, 'prenotazioni da confermare →', '#/gestione/prenotazioni', true)}
          {data.bottiglieComplete > 0 && box(data.bottiglieComplete, 'bottiglie complete da stappare →', '#/gestione/bottiglie', true)}
        </div>
      )}

      <div className="eyebrow" style={{ marginTop: 10 }}>In arrivo</div>
      <div className="grid2">
        {box(data.prossime, 'prenotazioni confermate', '#/gestione/prenotazioni')}
        {box(data.bottiglieAperte, 'bottiglie in condivisione', '#/gestione/bottiglie')}
      </div>

      <div className="eyebrow" style={{ marginTop: 10 }}>Clienti</div>
      <div className="grid2">
        {box(data.clienti, 'iscritti', '#/gestione/clienti')}
        {box(data.nuovi, 'nuovi negli ultimi 7 giorni', '#/gestione/clienti')}
      </div>

      <a className="card link" href="#/gestione/parola">
        <div className="eyebrow">Parola attuale</div>
        <div className="stat" style={{ marginTop: 8 }}>{data.parola?.parola ?? '— non impostata —'}</div>
        {data.parola && <div className="muted small" style={{ marginTop: 6 }}>Aggiornata il {formatDataOra(data.parola.aggiornata)} · tocca per cambiarla</div>}
      </a>

      <div className="muted small">
        Contenuti: {data.voci} voci nel menu · {data.news} news · {data.podcast} episodi podcast · {data.marketing} clienti con consenso marketing
      </div>
    </div>
  );
}
