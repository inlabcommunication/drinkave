import { DoorClosed, Eye, EyeOff, LogOut, Wine } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BottleViz } from '../components/BottleViz';
import { NotificheCard } from '../components/NotificheButton';
import { Deco, Loading } from '../components/Ui';
import { backend, ErroreUtente } from '../lib/backend';
import { vai } from '../lib/router';
import type { Profilo } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { tornaA, useCliente } from '../lib/useCliente';
import { emailValida, euro, formatDataOra, telefonoValido } from '../lib/util';

export default function AreaPage() {
  const cliente = useCliente();
  if (cliente === undefined) return <div className="wrap page"><Loading testo="Apriamo la porta…" /></div>;
  return cliente ? <AreaProfilo p={cliente} /> : <Accesso />;
}

function messaggio(e: unknown) {
  if (e instanceof ErroreUtente) return e.message;
  console.error(e);
  const code = (e as { code?: string })?.code;
  return `Connessione non riuscita. Riprova tra poco.${code ? ` (codice: ${code})` : ''}`;
}

function Accesso() {
  const [modo, setModo] = useState<'registrati' | 'accedi'>('registrati');
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [vedi, setVedi] = useState(false);
  const [f, setF] = useState({ nome: '', cognome: '', telefono: '', email: '', password: '', privacy: false, marketing: false });
  const set = (k: keyof typeof f) => (e: { target: { value: string; checked?: boolean; type?: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function invia(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    if (modo === 'registrati' && (!f.nome.trim() || !f.cognome.trim())) return setErrore('Nome e cognome sono obbligatori.');
    if (!telefonoValido(f.telefono)) return setErrore('Inserisci un numero di telefono valido.');
    if (modo === 'registrati') {
      if (f.email.trim() && !emailValida(f.email)) return setErrore('L’email non sembra corretta (puoi anche lasciarla vuota).');
      if (f.password.length < 6) return setErrore('La password deve avere almeno 6 caratteri.');
      if (!f.privacy) return setErrore('Per registrarti devi accettare l’informativa sulla privacy.');
    } else if (!f.password) return setErrore('Inserisci la password.');

    setBusy(true);
    try {
      const b = await backend();
      if (modo === 'registrati') {
        await b.registra({ nome: f.nome, cognome: f.cognome, telefono: f.telefono, email: f.email, password: f.password, consensoMarketing: f.marketing });
      } else {
        await b.login(f.telefono, f.password);
      }
    } catch (err) {
      setErrore(messaggio(err));
    } finally {
      setBusy(false);
    }
  }

  const campoPassword = (
    <label className="field">
      <span>Password{modo === 'registrati' ? ' * (almeno 6 caratteri)' : ''}</span>
      <div style={{ position: 'relative' }}>
        <input
          value={f.password}
          onChange={set('password')}
          type={vedi ? 'text' : 'password'}
          autoComplete={modo === 'registrati' ? 'new-password' : 'current-password'}
          style={{ paddingRight: 48 }}
          required
        />
        <button type="button" className="pw-toggle" onClick={() => setVedi(!vedi)} aria-label={vedi ? 'Nascondi password' : 'Mostra password'}>
          {vedi ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );

  return (
    <div className="wrap page stack">
      <header className="center">
        <div className="door"><DoorClosed size={44} strokeWidth={1.2} /></div>
        <div className="eyebrow">La tua area</div>
        <h1>Entra nel club</h1>
        <Deco />
        <p className="muted" style={{ maxWidth: '34ch', margin: '8px auto 0' }}>
          Crea il tuo profilo: scopri la parola d’ordine, prendi la tua parte di bottiglia e ritrova tutto qui.
        </p>
      </header>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={modo === 'registrati'} onClick={() => { setModo('registrati'); setErrore(null); }}>Registrati</button>
        <button role="tab" aria-selected={modo === 'accedi'} onClick={() => { setModo('accedi'); setErrore(null); }}>Accedi</button>
      </div>

      <form className="card stack" onSubmit={invia} noValidate>
        {modo === 'registrati' && (
          <div className="grid2">
            <label className="field">
              <span>Nome *</span>
              <input value={f.nome} onChange={set('nome')} autoComplete="given-name" maxLength={60} required />
            </label>
            <label className="field">
              <span>Cognome *</span>
              <input value={f.cognome} onChange={set('cognome')} autoComplete="family-name" maxLength={60} required />
            </label>
          </div>
        )}
        <label className="field">
          <span>Telefono{modo === 'registrati' ? ' *' : ''}</span>
          <input value={f.telefono} onChange={set('telefono')} type="tel" inputMode="tel" autoComplete="tel username" placeholder="333 123 4567" required />
        </label>
        {modo === 'registrati' && (
          <label className="field">
            <span>Email (facoltativa)</span>
            <input value={f.email} onChange={set('email')} type="email" inputMode="email" autoComplete="email" maxLength={120} />
          </label>
        )}
        {campoPassword}
        {modo === 'registrati' ? (
          <>
            <label className="check">
              <input type="checkbox" checked={f.privacy} onChange={set('privacy')} />
              <span>Ho letto l’<a href="#/privacy">informativa privacy</a> e acconsento al trattamento dei miei dati. *</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={f.marketing} onChange={set('marketing')} />
              <span>Voglio ricevere inviti a eventi e promozioni (facoltativo).</span>
            </label>
          </>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>Password dimenticata? Chiedi al locale di reimpostarla.</p>
        )}
        {errore && <div className="msg err" role="alert">{errore}</div>}
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? 'Un momento…' : modo === 'registrati' ? 'Crea il mio profilo' : 'Entra'}
        </button>
      </form>
    </div>
  );
}

function AreaProfilo({ p }: { p: Profilo }) {
  const parola = useAsync(async () => (await backend()).getParola(), [p.uid]);
  const dati = useAsync(async () => {
    const b = await backend();
    const [quote, bottiglie] = await Promise.all([b.mieQuote(), b.listBottiglie()]);
    return { quote, bottiglie };
  }, [p.uid]);

  useEffect(() => {
    const t = tornaA();
    if (t) vai(t);
  }, []);

  const mie = useMemo(() => {
    if (!dati.data) return [];
    const perBottiglia = new Map<string, { parti: number; importo: number; nome: string }>();
    for (const q of dati.data.quote) {
      const x = perBottiglia.get(q.bottigliaId) ?? { parti: 0, importo: 0, nome: q.bottigliaNome };
      x.parti += q.parti;
      x.importo += q.importo;
      perBottiglia.set(q.bottigliaId, x);
    }
    return [...perBottiglia.entries()].map(([id, x]) => ({ id, ...x, b: dati.data!.bottiglie.find((b) => b.id === id) }));
  }, [dati.data]);

  return (
    <div className="wrap page stack">
      <header className="center">
        <div className="eyebrow">Bentornato</div>
        <h1>{p.nome}</h1>
        <Deco />
      </header>

      <div className="secret">
        <div className="eyebrow">La parola d’ordine è</div>
        {parola.caricamento ? <Loading /> : parola.data ? (
          <>
            <div className="word">{parola.data.parola}</div>
            {parola.data.nota && <p className="muted" style={{ margin: 0 }}>{parola.data.nota}</p>}
            <p className="muted small" style={{ marginBottom: 0 }}>Aggiornata il {formatDataOra(parola.data.aggiornata)}</p>
          </>
        ) : <p className="muted">{parola.errore}</p>}
      </div>
      <p className="center muted small">Sussurrala alla porta. Non condividerla.</p>

      <div className="ornament" aria-hidden="true"><span>LE TUE BOTTIGLIE</span></div>
      {dati.caricamento && <Loading />}
      {dati.data && mie.length === 0 && (
        <div className="card center stack">
          <p className="muted" style={{ margin: 0 }}>Non hai ancora preso parte a nessuna bottiglia.</p>
          <a className="btn ghost" href="#/bottiglie"><Wine size={16} /> Scopri la bottiglia condivisa</a>
        </div>
      )}
      {mie.map((m) => (
        <a key={m.id} className="card link bottle-card" href={`#/bottiglie/${m.id}`}>
          {m.b && <BottleViz parti={m.b.parti} prese={m.b.partiPrese} categoria={m.b.categoria} nome={m.b.nome} size={96} />}
          <div className="bottle-info">
            <h3>{m.nome}</h3>
            <div className="small">
              I tuoi calici: <strong>{m.parti}</strong> · {euro(m.importo)}
            </div>
            {m.b?.stato === 'completa' ? (
              <div className="pronto-mini">Adesso sei pronto ad assaggiarla?</div>
            ) : m.b?.stato === 'servita' ? (
              <span className="badge">Servita</span>
            ) : m.b ? (
              <>
                <div className="progress" aria-hidden="true"><span style={{ width: `${(m.b.partiPrese / m.b.parti) * 100}%` }} /></div>
                <div className="muted small">Mancano {m.b.parti - m.b.partiPrese} calici per stapparla</div>
              </>
            ) : null}
          </div>
        </a>
      ))}

      <div className="ornament" aria-hidden="true"><span>◆</span></div>
      <NotificheCard />

      <div className="card stack">
        <h3>I tuoi dati</h3>
        <div className="small">
          <div>{p.nome} {p.cognome}</div>
          <div className="muted">{p.telefono}{p.email ? ` · ${p.email}` : ''}</div>
          <div className="muted">Iscritto dal {formatDataOra(p.creato)}</div>
        </div>
        <button className="btn ghost sm" onClick={async () => (await backend()).logout()}>
          <LogOut size={14} /> Esci
        </button>
      </div>
    </div>
  );
}
