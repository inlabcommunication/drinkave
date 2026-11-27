import { CheckCircle2, Copy, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { BottleViz } from '../components/BottleViz';
import { Loading } from '../components/Ui';
import type { Backend } from '../lib/backend';
import type { Bottiglia, Quota } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { euro, formatDataOra, uid } from '../lib/util';

const categorie = ['Vino rosso', 'Vino bianco', 'Rosato', 'Bollicine', 'Distillato', 'Liquore', 'Amaro'];

const nuova = (): Bottiglia => ({
  id: uid(),
  nome: '',
  categoria: 'Vino rosso',
  descrizione: '',
  immagine: '',
  prezzo: 60,
  parti: 6,
  partiPrese: 0,
  stato: 'aperta',
  pubblicata: true,
  creata: Date.now(),
});

export default function BottiglieAdmin({ b }: { b: Backend }) {
  const { data, caricamento, ricarica } = useAsync(() => b.listBottiglie(true));
  const [edit, setEdit] = useState<Bottiglia | null>(null);
  const [aperta, setAperta] = useState<string | null>(null);

  if (edit) return <Editor b={b} iniziale={edit} esistente={!!data?.some((x) => x.id === edit.id)} onFine={() => { setEdit(null); ricarica(); }} />;

  return (
    <div className="stack">
      <div className="row">
        <h2>Bottiglia condivisa</h2>
        <span className="spacer" />
        <button className="btn" onClick={() => setEdit(nuova())}><Plus size={16} /> Nuova bottiglia</button>
      </div>
      <p className="muted small">
        Ogni bottiglia è divisa in calici. I clienti prendono la loro parte dall’app; quando tutti i calici sono presi diventa “Completa”.
        Dopo averla stappata segnala come “Servita”.
      </p>
      {caricamento && <Loading />}
      {data?.length === 0 && <div className="empty">Nessuna bottiglia. Creane una.</div>}
      {data?.map((x) => (
        <div key={x.id} className="card stack">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <BottleViz parti={x.parti} prese={x.partiPrese} categoria={x.categoria} nome={x.nome} size={90} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className="row" style={{ gap: 6 }}>
                <span className={`badge ${x.stato === 'aperta' ? 'on' : x.stato === 'completa' ? 'gold' : ''}`}>
                  {x.stato === 'aperta' ? 'Aperta' : x.stato === 'completa' ? 'Completa' : 'Servita'}
                </span>
                {!x.pubblicata && <span className="badge">Nascosta</span>}
              </div>
              <h3 style={{ marginTop: 6 }}>{x.nome}</h3>
              <div className="muted small">
                {x.categoria} · {euro(x.prezzo)} · {x.parti} calici da {euro(x.prezzo / x.parti)} · presi {x.partiPrese}/{x.parti}
              </div>
            </div>
          </div>
          <div className="row">
            <button className="btn ghost sm" onClick={() => setAperta(aperta === x.id ? null : x.id)}><Users size={14} /> Partecipanti</button>
            <button className="btn ghost sm" onClick={() => setEdit(x)}><Pencil size={14} /> Modifica</button>
            {x.stato === 'completa' && (
              <button className="btn sm" onClick={async () => { await b.setStatoBottiglia(x.id, 'servita'); ricarica(); }}>
                <CheckCircle2 size={14} /> Segna come servita
              </button>
            )}
            {x.stato !== 'aperta' && (
              <button className="btn ghost sm" title="Crea una nuova bottiglia uguale, vuota" onClick={() => setEdit({ ...nuova(), nome: x.nome, categoria: x.categoria, descrizione: x.descrizione, immagine: x.immagine, prezzo: x.prezzo, parti: x.parti })}>
                <Copy size={14} /> Nuovo giro
              </button>
            )}
            <span className="spacer" />
            <button
              className="icon-btn"
              title="Elimina"
              onClick={async () => {
                if (confirm(`Eliminare “${x.nome}”? ${x.partiPrese ? 'Ci sono già calici presi: i clienti non la vedranno più.' : ''}`)) {
                  await b.deleteBottiglia(x.id);
                  ricarica();
                }
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
          {aperta === x.id && <Partecipanti b={b} bottiglia={x} />}
        </div>
      ))}
    </div>
  );
}

function Partecipanti({ b, bottiglia }: { b: Backend; bottiglia: Bottiglia }) {
  const { data, caricamento } = useAsync<Quota[]>(() => b.listQuote(bottiglia.id), [bottiglia.id]);
  if (caricamento) return <Loading />;
  if (!data?.length) return <div className="muted small">Nessun calice preso finora.</div>;
  const totale = data.reduce((s, q) => s + q.importo, 0);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Cliente</th><th>Telefono</th><th>Calici</th><th>Importo</th><th>Quando</th></tr>
        </thead>
        <tbody>
          {data.map((q) => (
            <tr key={q.id}>
              <td>{q.nome}</td>
              <td><a href={`tel:${q.telefono}`}>{q.telefono}</a></td>
              <td>{q.parti}</td>
              <td>{euro(q.importo)}</td>
              <td className="muted">{formatDataOra(q.quando)}</td>
            </tr>
          ))}
          <tr><td colSpan={2}><strong>Totale</strong></td><td><strong>{data.reduce((s, q) => s + q.parti, 0)}</strong></td><td><strong>{euro(totale)}</strong></td><td /></tr>
        </tbody>
      </table>
    </div>
  );
}

function Editor({ b, iniziale, esistente, onFine }: { b: Backend; iniziale: Bottiglia; esistente: boolean; onFine: () => void }) {
  const [x, setX] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<Bottiglia>) => setX({ ...x, ...p });
  const bloccaParti = esistente && iniziale.partiPrese > 0;

  async function salva() {
    if (!x.nome.trim()) return setErrore('Il nome è obbligatorio.');
    if (!(x.prezzo > 0)) return setErrore('Inserisci un prezzo valido.');
    if (!Number.isInteger(x.parti) || x.parti < 2 || x.parti > 24) return setErrore('Le parti devono essere tra 2 e 24.');
    setBusy(true);
    setErrore(null);
    try {
      await b.saveBottiglia({ ...x, nome: x.nome.trim() });
      onFine();
    } catch {
      setErrore('Salvataggio non riuscito.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 680 }}>
      <h2>{esistente ? 'Modifica bottiglia' : 'Nuova bottiglia'}</h2>
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'center' }}>
          <BottleViz parti={x.parti || 1} prese={x.partiPrese} categoria={x.categoria} nome={x.nome} size={150} />
        </div>
        <label className="field">
          <span>Nome della bottiglia *</span>
          <input value={x.nome} onChange={(e) => set({ nome: e.target.value })} maxLength={80} placeholder="Es. Primitivo di Manduria Riserva" />
        </label>
        <label className="field">
          <span>Tipo</span>
          <select value={x.categoria} onChange={(e) => set({ categoria: e.target.value })}>
            {categorie.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Descrizione</span>
          <textarea value={x.descrizione} onChange={(e) => set({ descrizione: e.target.value })} rows={3} maxLength={400} />
        </label>
        <div className="grid2">
          <label className="field">
            <span>Prezzo bottiglia (€)</span>
            <input type="number" min={1} step="0.5" inputMode="decimal" value={x.prezzo} onChange={(e) => set({ prezzo: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Diviso in (calici)</span>
            <input type="number" min={2} max={24} step={1} value={x.parti} disabled={bloccaParti} onChange={(e) => set({ parti: Math.round(Number(e.target.value)) })} />
          </label>
        </div>
        <div className="muted small">
          Ogni calice costa <strong>{x.parti > 0 ? euro(x.prezzo / x.parti) : '—'}</strong>.
          {bloccaParti && ' Le parti non si possono cambiare dopo che qualcuno ha già preso un calice.'}
        </div>
        <label className="check">
          <input type="checkbox" checked={x.pubblicata} onChange={(e) => set({ pubblicata: e.target.checked })} />
          <span>Visibile nell’app</span>
        </label>
        {errore && <div className="msg err">{errore}</div>}
        <div className="row">
          <button className="btn" onClick={salva} disabled={busy}>{busy ? 'Salvataggio…' : 'Salva'}</button>
          <button className="btn ghost" onClick={onFine}>Annulla</button>
        </div>
      </div>
    </div>
  );
}
