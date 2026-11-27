import { ArrowLeft, Minus, Plus, Sparkles, Wine } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BottleViz, Calici } from '../components/BottleViz';
import { Deco, Errore, Loading } from '../components/Ui';
import { backend, ErroreUtente } from '../lib/backend';
import type { Bottiglia } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { useCliente } from '../lib/useCliente';
import { euro } from '../lib/util';

const aCalice = (b: Bottiglia) => b.prezzo / b.parti;

function StatoBadge({ b }: { b: Bottiglia }) {
  if (b.stato === 'servita') return <span className="badge">Servita</span>;
  if (b.stato === 'completa') return <span className="badge gold">Completa</span>;
  return <span className="badge on">Aperta · {b.parti - b.partiPrese} calici liberi</span>;
}

export default function BottigliePage({ id }: { id?: string }) {
  const cliente = useCliente();
  const bottiglie = useAsync(async () => (await backend()).listBottiglie());
  const quote = useAsync(async () => (cliente ? (await backend()).mieQuote() : []), [cliente?.uid]);

  const mie = useMemo(() => {
    const m: Record<string, number> = {};
    for (const q of quote.data ?? []) m[q.bottigliaId] = (m[q.bottigliaId] ?? 0) + q.parti;
    return m;
  }, [quote.data]);

  if (id) {
    const b = bottiglie.data?.find((x) => x.id === id);
    return (
      <div className="wrap page">
        <a className="back" href="#/bottiglie"><ArrowLeft size={14} /> Tutte le bottiglie</a>
        {bottiglie.caricamento && <Loading />}
        {!bottiglie.caricamento && !b && <div className="empty">Bottiglia non trovata.</div>}
        {b && (
          <Dettaglio
            b={b}
            mie={mie[b.id] ?? 0}
            loggato={!!cliente}
            onAggiornata={(nuova) => {
              bottiglie.setData((lista) => lista?.map((x) => (x.id === nuova.id ? nuova : x)) ?? null);
              quote.ricarica();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="wrap page">
      <header className="center">
        <div className="eyebrow">Si apre solo insieme</div>
        <h1>Bottiglia condivisa</h1>
        <Deco />
        <p className="muted" style={{ maxWidth: '34ch', margin: '8px auto 0' }}>
          Bevi una grande bottiglia senza comprarla tutta: la dividi con altri ospiti.
        </p>
        <div className="passi">
          <div><b>1</b>Scegli quanti calici vuoi</div>
          <div><b>2</b>Gli altri prendono i restanti</div>
          <div><b>3</b>Piena? Si stappa e paghi al locale</div>
        </div>
      </header>

      {bottiglie.caricamento && <Loading />}
      {bottiglie.errore && <Errore testo="Non riusciamo a caricare le bottiglie." onRiprova={bottiglie.ricarica} />}
      {bottiglie.data?.length === 0 && <div className="empty">Nessuna bottiglia in condivisione al momento.</div>}

      <div className="stack" style={{ marginTop: 20 }}>
        {bottiglie.data?.map((b) => (
          <a key={b.id} className="card link bottle-card" href={`#/bottiglie/${b.id}`}>
            <BottleViz parti={b.parti} prese={b.partiPrese} categoria={b.categoria} nome={b.nome} size={118} />
            <div className="bottle-info">
              <div className="meta">{b.categoria}</div>
              <h3>{b.nome}</h3>
              <div className="prezzo-calice">
                {euro(aCalice(b))} <span>a calice</span>
              </div>
              <div className="progress" aria-hidden="true">
                <span style={{ width: `${(b.partiPrese / b.parti) * 100}%` }} />
              </div>
              <div className="row small" style={{ gap: 6 }}>
                <StatoBadge b={b} />
                {mie[b.id] ? <span className="badge mio">Tuoi: {mie[b.id]}</span> : null}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function Dettaglio({
  b,
  mie,
  loggato,
  onAggiornata,
}: {
  b: Bottiglia;
  mie: number;
  loggato: boolean;
  onAggiornata: (b: Bottiglia) => void;
}) {
  const rimaste = b.parti - b.partiPrese;
  const [n, setN] = useState(1);
  const [conferma, setConferma] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState<string | null>(null);
  const quanti = Math.min(n, Math.max(rimaste, 1));
  const totale = Math.round(aCalice(b) * quanti * 100) / 100;

  async function acquista() {
    setBusy(true);
    setErrore(null);
    try {
      const nuova = await (await backend()).acquistaParti(b.id, quanti);
      setFatto(`Fatto! Hai preso ${quanti} ${quanti === 1 ? 'calice' : 'calici'}.`);
      setConferma(false);
      setN(1);
      onAggiornata(nuova);
    } catch (e) {
      setErrore(e instanceof ErroreUtente ? e.message : 'Acquisto non riuscito. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="bottle-detail">
      <div className="bottle-top">
        <div className="bottle-stage">
          <BottleViz parti={b.parti} prese={b.partiPrese} categoria={b.categoria} nome={b.nome} size={200} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="meta">{b.categoria}</div>
          <h1 style={{ marginTop: 4 }}>{b.nome}</h1>
          <div className="prezzo-calice" style={{ marginTop: 8 }}>
            {euro(aCalice(b))} <span>a calice</span>
          </div>
          <div className="muted small">Bottiglia intera {euro(b.prezzo)}</div>
          <div className="small" style={{ marginTop: 8 }}>
            <strong>{b.partiPrese}</strong> di {b.parti} calici presi{mie ? ` · ${mie} tuoi` : ''}
          </div>
        </div>
      </div>
      <Calici parti={b.parti} prese={b.partiPrese} mie={mie} />

      {b.stato !== 'aperta' && (
        <div className="pronto">
          <Sparkles size={28} />
          {b.stato === 'completa' ? (
            <>
              <h2>Adesso sei pronto ad assaggiarla?</h2>
              <p>Tutti i calici sono stati presi: la bottiglia si stappa. Passa al bancone e di’ la parola d’ordine.</p>
            </>
          ) : (
            <>
              <h2>Bottiglia servita</h2>
              <p>Questa bottiglia è stata stappata e condivisa. Alla prossima!</p>
            </>
          )}
        </div>
      )}

      {fatto && <div className="msg ok" style={{ marginTop: 16 }}>{fatto}</div>}

      {b.stato === 'aperta' && (
        <div className="card stack" style={{ marginTop: 18 }}>
          {!loggato ? (
            <>
              <p className="muted small" style={{ margin: 0 }}>Per prendere la tua parte entra nella tua area personale.</p>
              <a className="btn block" href={`#/area?torna=${encodeURIComponent('/bottiglie/' + b.id)}`}>Accedi o registrati</a>
            </>
          ) : conferma ? (
            <>
              <h3>Confermi?</h3>
              <p style={{ margin: 0 }}>
                {quanti} {quanti === 1 ? 'calice' : 'calici'} di <strong>{b.nome}</strong> per <strong>{euro(totale)}</strong>.
              </p>
              <p className="muted small" style={{ margin: 0 }}>Il pagamento si fa al locale, quando la bottiglia viene stappata.</p>
              {errore && <div className="msg err">{errore}</div>}
              <div className="row">
                <button className="btn" onClick={acquista} disabled={busy}>{busy ? 'Un momento…' : 'Conferma'}</button>
                <button className="btn ghost" onClick={() => setConferma(false)} disabled={busy}>Annulla</button>
              </div>
            </>
          ) : (
            <>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">Quanti calici?</span>
                <div className="stepper">
                  <button className="icon-btn" aria-label="Meno" onClick={() => setN(Math.max(1, quanti - 1))} disabled={quanti <= 1}><Minus size={16} /></button>
                  <span className="stat" aria-live="polite">{quanti}</span>
                  <button className="icon-btn" aria-label="Più" onClick={() => setN(Math.min(rimaste, quanti + 1))} disabled={quanti >= rimaste}><Plus size={16} /></button>
                </div>
              </div>
              <button className="btn block" onClick={() => { setFatto(null); setConferma(true); }}>
                <Wine size={16} /> Acquista {quanti} {quanti === 1 ? 'calice' : 'calici'} · {euro(totale)}
              </button>
              <p className="muted small center" style={{ margin: 0 }}>Restano {rimaste} calici su {b.parti}.</p>
            </>
          )}
        </div>
      )}

      {b.descrizione && <p className="muted" style={{ marginTop: 18 }}>{b.descrizione}</p>}
    </article>
  );
}
