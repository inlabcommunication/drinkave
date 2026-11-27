import { CalendarDays, CheckCircle2, Minus, Plus, Ticket, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { GiornoBox } from '../components/MiePrenotazioni';
import { Deco, Errore, Loading } from '../components/Ui';
import { backend, ErroreUtente } from '../lib/backend';
import { vai } from '../lib/router';
import type { Evento } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { useCliente } from '../lib/useCliente';
import { euro } from '../lib/util';

const GIORNO = 86_400_000;
/** Orari prenotabili: dalle 18:30 all'01:00. */
const ORARI = ['18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00'];

const isoOggi = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const isoTra = (giorni: number) => {
  const d = new Date(Date.now() + giorni * GIORNO);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** Giorno + ora → millisecondi; gli orari dopo mezzanotte cadono nel giorno successivo. */
function quando(giorno: string, ora: string): number {
  const [h, m] = ora.split(':').map(Number);
  const d = new Date(`${giorno}T00:00:00`);
  d.setHours(h, m, 0, 0);
  if (h < 12) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export const dataEvento = (ms: number) =>
  new Date(ms).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default function PrenotaPage({ sezione }: { sezione?: string }) {
  const tab = sezione === 'eventi' ? 'eventi' : 'tavolo';
  const cliente = useCliente();

  return (
    <div className="wrap page stack">
      <header className="center">
        <div className="eyebrow">Riserva il tuo posto</div>
        <h1>Prenota</h1>
        <Deco />
      </header>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'tavolo'} onClick={() => vai('/prenota')}>Tavolo</button>
        <button role="tab" aria-selected={tab === 'eventi'} onClick={() => vai('/prenota/eventi')}>Eventi</button>
      </div>

      {tab === 'tavolo' ? <Tavolo abilitato={!!cliente} /> : <Eventi abilitato={!!cliente} />}
    </div>
  );
}

function Tavolo({ abilitato }: { abilitato: boolean }) {
  const [giorno, setGiorno] = useState(isoOggi());
  const [ora, setOra] = useState('21:00');
  const [persone, setPersone] = useState(2);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  async function invia(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    const data = quando(giorno, ora);
    if (data < Date.now()) return setErrore('Scegli un giorno e un orario futuri.');
    setBusy(true);
    try {
      await (await backend()).prenotaTavolo({ data, persone, note });
      setFatto(true);
    } catch (err) {
      setErrore(err instanceof ErroreUtente ? err.message : 'Invio non riuscito. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  if (fatto) {
    return (
      <div className="pronto">
        <CheckCircle2 size={28} />
        <h2>Richiesta inviata</h2>
        <p>
          Tavolo per {persone} {persone === 1 ? 'persona' : 'persone'}, {dataEvento(quando(giorno, ora))}. Ti confermiamo al più presto: trovi lo stato nella tua area.
        </p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
          <a className="btn ghost sm" href="#/area">La mia area</a>
          <button className="btn ghost sm" onClick={() => { setFatto(false); setNote(''); }}>Nuova richiesta</button>
        </div>
      </div>
    );
  }

  return (
    <form className="card stack" onSubmit={invia}>
      <div className="grid2">
        <label className="field">
          <span>Giorno</span>
          <input type="date" value={giorno} min={isoOggi()} max={isoTra(90)} onChange={(e) => setGiorno(e.target.value)} required />
        </label>
        <label className="field">
          <span>Ora</span>
          <select value={ora} onChange={(e) => setOra(e.target.value)}>
            {ORARI.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow">Persone</span>
        <div className="stepper">
          <button type="button" className="icon-btn" aria-label="Meno persone" onClick={() => setPersone(Math.max(1, persone - 1))} disabled={persone <= 1}><Minus size={16} /></button>
          <span className="stat" aria-live="polite">{persone}</span>
          <button type="button" className="icon-btn" aria-label="Più persone" onClick={() => setPersone(Math.min(12, persone + 1))} disabled={persone >= 12}><Plus size={16} /></button>
        </div>
      </div>
      {persone >= 12 && <p className="muted small" style={{ margin: 0 }}>Per gruppi più numerosi o eventi privati scrivici in DM su Instagram.</p>}
      <label className="field">
        <span>Note (facoltative)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} placeholder="Compleanno, allergie, preferenze…" />
      </label>
      {errore && <div className="msg err">{errore}</div>}
      {abilitato ? (
        <button className="btn block" type="submit" disabled={busy}>
          <CalendarDays size={16} /> {busy ? 'Invio…' : 'Richiedi il tavolo'}
        </button>
      ) : (
        <a className="btn block" href={`#/area?torna=${encodeURIComponent('/prenota')}`}>
          Accedi per prenotare
        </a>
      )}
      <p className="muted small center" style={{ margin: 0 }}>
        {abilitato ? 'La prenotazione è valida dopo la nostra conferma.' : 'Serve un profilo (un minuto): così ritrovi le tue prenotazioni.'}
      </p>
    </form>
  );
}

function Eventi({ abilitato }: { abilitato: boolean }) {
  const { data, caricamento, errore, ricarica, setData } = useAsync(async () => (await backend()).listEventi());
  if (caricamento) return <Loading />;
  if (errore) return <Errore testo="Non riusciamo a caricare gli eventi." onRiprova={ricarica} />;
  if (!data?.length) return <div className="empty">Nessun evento in programma. Attiva le notifiche per sapere quando ne annunciamo uno.</div>;
  return (
    <div className="stack">
      {data.map((e) => (
        <CardEvento key={e.id} e={e} abilitato={abilitato} onAggiorna={(n) => setData((l) => l?.map((x) => (x.id === n.id ? n : x)) ?? null)} />
      ))}
    </div>
  );
}

function CardEvento({ e, abilitato, onAggiorna }: { e: Evento; abilitato: boolean; onAggiorna: (e: Evento) => void }) {
  const liberi = e.posti - e.postiPrenotati;
  const [persone, setPersone] = useState(1);
  const [note, setNote] = useState('');
  const [aperto, setAperto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState<string | null>(null);
  const n = Math.min(persone, Math.max(1, liberi));

  async function prenota() {
    setBusy(true);
    setErrore(null);
    try {
      await (await backend()).prenotaEvento(e.id, n, note);
      setFatto(`Prenotato! ${n} ${n === 1 ? 'posto' : 'posti'} per “${e.titolo}”. Lo trovi nella tua area.`);
      setAperto(false);
      onAggiorna({ ...e, postiPrenotati: e.postiPrenotati + n });
    } catch (err) {
      setErrore(err instanceof ErroreUtente ? err.message : 'Prenotazione non riuscita. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card evento stack">
      <div className="evento-head">
        <GiornoBox ms={e.data} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="meta">{dataEvento(e.data)}</div>
          <h3 style={{ marginTop: 4 }}>{e.titolo}</h3>
          <div className="row small" style={{ gap: 8, marginTop: 6 }}>
            <span className="badge"><Ticket size={12} /> {e.prezzo ? `${euro(e.prezzo)} a persona` : 'Ingresso libero'}</span>
            <span className={`badge ${liberi > 0 ? 'on' : ''}`}><Users size={12} /> {liberi > 0 ? `${liberi} posti liberi` : 'Esaurito'}</span>
          </div>
        </div>
      </div>
      {e.descrizione && <p className="muted small" style={{ margin: 0, whiteSpace: 'pre-line' }}>{e.descrizione}</p>}
      <div className="progress" aria-hidden="true"><span style={{ width: `${(e.postiPrenotati / e.posti) * 100}%` }} /></div>
      {fatto && <div className="msg ok">{fatto}</div>}
      {liberi > 0 && !abilitato && (
        <a className="btn" href={`#/area?torna=${encodeURIComponent('/prenota/eventi')}`}>Accedi per prenotare</a>
      )}
      {liberi > 0 && abilitato && !aperto && (
        <button className="btn" onClick={() => { setFatto(null); setAperto(true); }}>Prenota il tuo posto</button>
      )}
      {liberi > 0 && abilitato && aperto && (
        <div className="stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow">Persone</span>
            <div className="stepper">
              <button className="icon-btn" aria-label="Meno persone" onClick={() => setPersone(Math.max(1, n - 1))} disabled={n <= 1}><Minus size={16} /></button>
              <span className="stat" aria-live="polite">{n}</span>
              <button className="icon-btn" aria-label="Più persone" onClick={() => setPersone(Math.min(liberi, 10, n + 1))} disabled={n >= Math.min(liberi, 10)}><Plus size={16} /></button>
            </div>
          </div>
          <label className="field">
            <span>Note (facoltative)</span>
            <input value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={300} />
          </label>
          {errore && <div className="msg err">{errore}</div>}
          <div className="row">
            <button className="btn" onClick={prenota} disabled={busy}>
              {busy ? 'Un momento…' : `Conferma ${n} ${n === 1 ? 'posto' : 'posti'}${e.prezzo ? ` · ${euro(e.prezzo * n)}` : ''}`}
            </button>
            <button className="btn ghost" onClick={() => setAperto(false)} disabled={busy}>Annulla</button>
          </div>
          {e.prezzo > 0 && <p className="muted small" style={{ margin: 0 }}>Il pagamento si fa al locale.</p>}
        </div>
      )}
    </article>
  );
}
