import { Check, Download, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { etichettaStato, GiornoBox } from '../components/MiePrenotazioni';
import { Loading } from '../components/Ui';
import type { Backend } from '../lib/backend';
import type { Evento, Prenotazione } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { euro, uid } from '../lib/util';

const inizioOggi = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

async function esporta(lista: Prenotazione[]) {
  const { default: writeXlsxFile } = await import('write-excel-file');
  const h = ['Data e ora', 'Tipo', 'Evento', 'Nome', 'Telefono', 'Persone', 'Stato', 'Note'].map((value) => ({ value, fontWeight: 'bold' as const }));
  const righe = lista.map((p) => [
    { type: Date, value: new Date(p.data), format: 'dd/mm/yyyy hh:mm' },
    { type: String, value: p.tipo === 'evento' ? 'Evento' : 'Tavolo' },
    { type: String, value: p.eventoTitolo },
    { type: String, value: p.nome },
    { type: String, value: p.telefono },
    { type: Number, value: p.persone },
    { type: String, value: etichettaStato[p.stato][0] },
    { type: String, value: p.note },
  ]);
  await writeXlsxFile([h, ...righe], {
    columns: [{ width: 18 }, { width: 10 }, { width: 24 }, { width: 22 }, { width: 16 }, { width: 9 }, { width: 20 }, { width: 40 }],
    sheet: 'Prenotazioni',
    fileName: `drinkave-prenotazioni-${new Date().toISOString().slice(0, 10)}.xlsx`,
    stickyRowsCount: 1,
  });
}

export default function PrenotazioniAdmin({ b }: { b: Backend }) {
  const [tab, setTab] = useState<'prenotazioni' | 'eventi'>('prenotazioni');
  return (
    <div className="stack">
      <h2>Prenotazioni</h2>
      <div className="tabs" role="tablist" style={{ maxWidth: 420 }}>
        <button role="tab" aria-selected={tab === 'prenotazioni'} onClick={() => setTab('prenotazioni')}>Richieste</button>
        <button role="tab" aria-selected={tab === 'eventi'} onClick={() => setTab('eventi')}>Eventi</button>
      </div>
      {tab === 'prenotazioni' ? <Lista b={b} /> : <EventiAdmin b={b} />}
    </div>
  );
}

function Lista({ b }: { b: Backend }) {
  const { data, caricamento, ricarica } = useAsync(() => b.listPrenotazioni(inizioOggi()));
  const [filtro, setFiltro] = useState<'tutte' | 'richiesta' | 'tavolo' | 'evento'>('tutte');
  const [busy, setBusy] = useState<string | null>(null);

  const visibili = useMemo(
    () =>
      (data ?? []).filter((p) =>
        filtro === 'tutte' ? true : filtro === 'richiesta' ? p.stato === 'richiesta' : p.tipo === filtro,
      ),
    [data, filtro],
  );
  const perGiorno = useMemo(() => {
    const m = new Map<string, Prenotazione[]>();
    for (const p of visibili) {
      const k = new Date(p.data - 6 * 3600_000).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return [...m.entries()];
  }, [visibili]);
  const daConfermare = (data ?? []).filter((p) => p.stato === 'richiesta').length;

  async function cambia(p: Prenotazione, stato: Prenotazione['stato']) {
    setBusy(p.id);
    try {
      await b.setStatoPrenotazione(p, stato);
    } finally {
      setBusy(null);
      ricarica();
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <select className="field" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} style={{ minHeight: 40, borderRadius: 10, background: '#071110', border: '1px solid var(--line)', padding: '0 10px' }} aria-label="Filtro">
          <option value="tutte">Tutte</option>
          <option value="richiesta">Da confermare ({daConfermare})</option>
          <option value="tavolo">Solo tavoli</option>
          <option value="evento">Solo eventi</option>
        </select>
        <span className="spacer" />
        <button className="btn sm" onClick={() => esporta(visibili)} disabled={!visibili.length}><Download size={14} /> Excel</button>
      </div>
      {caricamento && <Loading />}
      {data && !visibili.length && <div className="empty">Nessuna prenotazione da oggi in poi.</div>}
      {perGiorno.map(([giorno, lista]) => (
        <div key={giorno} className="stack">
          <div className="eyebrow" style={{ marginTop: 10 }}>
            {giorno} · {lista.filter((p) => p.stato === 'confermata' || p.stato === 'richiesta').reduce((s, p) => s + p.persone, 0)} persone
          </div>
          {lista.map((p) => {
            const [label, cls] = etichettaStato[p.stato];
            return (
              <div key={p.id} className="card pren">
                <GiornoBox ms={p.data} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <strong>{p.nome}</strong>
                    <span className={`badge ${cls}`}>{label}</span>
                  </div>
                  <div className="small">
                    {p.tipo === 'evento' ? `Evento: ${p.eventoTitolo}` : 'Tavolo'} · {p.persone} {p.persone === 1 ? 'persona' : 'persone'} ·{' '}
                    <a href={`tel:${p.telefono}`}>{p.telefono}</a>
                  </div>
                  {p.note && <div className="muted small">“{p.note}”</div>}
                  <div className="row" style={{ gap: 6, marginTop: 8 }}>
                    {p.stato === 'richiesta' && (
                      <>
                        <button className="btn sm" disabled={busy === p.id} onClick={() => cambia(p, 'confermata')}><Check size={14} /> Conferma</button>
                        <button className="btn ghost sm" disabled={busy === p.id} onClick={() => cambia(p, 'rifiutata')}><X size={14} /> Rifiuta</button>
                      </>
                    )}
                    {p.stato === 'confermata' && (
                      <button className="btn ghost sm" disabled={busy === p.id} onClick={() => confirm('Annullare questa prenotazione?') && cambia(p, 'annullata')}>
                        <X size={14} /> Annulla
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const toLocal = (ms: number) => new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function EventiAdmin({ b }: { b: Backend }) {
  const { data, caricamento, ricarica } = useAsync(() => b.listEventi(true));
  const [edit, setEdit] = useState<Evento | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nuovo = (): Evento => {
    const d = new Date(Date.now() + 7 * 86_400_000);
    d.setHours(21, 0, 0, 0);
    return { id: uid(), titolo: '', descrizione: '', immagine: '', data: d.getTime(), posti: 30, postiPrenotati: 0, prezzo: 0, pubblicato: true };
  };

  async function salva() {
    if (!edit) return;
    if (!edit.titolo.trim()) return setErrore('Il titolo è obbligatorio.');
    if (!(edit.posti >= 1) || edit.posti < edit.postiPrenotati) return setErrore(`I posti devono essere almeno ${Math.max(1, edit.postiPrenotati)}.`);
    setBusy(true);
    setErrore(null);
    try {
      await b.saveEvento({ ...edit, titolo: edit.titolo.trim() });
      setEdit(null);
      ricarica();
    } catch {
      setErrore('Salvataggio non riuscito.');
    } finally {
      setBusy(false);
    }
  }

  if (edit) {
    const set = (p: Partial<Evento>) => setEdit({ ...edit, ...p });
    return (
      <div className="card stack" style={{ maxWidth: 640 }}>
        <h3>{data?.some((x) => x.id === edit.id) ? 'Modifica evento' : 'Nuovo evento'}</h3>
        <label className="field"><span>Titolo *</span><input value={edit.titolo} onChange={(e) => set({ titolo: e.target.value })} maxLength={100} placeholder="Es. Vino & Convivio" /></label>
        <label className="field"><span>Data e ora</span><input type="datetime-local" value={toLocal(edit.data)} onChange={(e) => e.target.value && set({ data: new Date(e.target.value).getTime() })} /></label>
        <div className="grid2">
          <label className="field"><span>Posti totali</span><input type="number" min={1} value={edit.posti} onChange={(e) => set({ posti: Math.round(Number(e.target.value)) })} /></label>
          <label className="field"><span>Prezzo a persona € (0 = libero)</span><input type="number" min={0} step="0.5" value={edit.prezzo} onChange={(e) => set({ prezzo: Number(e.target.value) })} /></label>
        </div>
        <label className="field"><span>Descrizione</span><textarea value={edit.descrizione} onChange={(e) => set({ descrizione: e.target.value })} rows={4} maxLength={800} /></label>
        <label className="check"><input type="checkbox" checked={edit.pubblicato} onChange={(e) => set({ pubblicato: e.target.checked })} /><span>Visibile e prenotabile nell’app</span></label>
        {errore && <div className="msg err">{errore}</div>}
        <div className="row">
          <button className="btn" onClick={salva} disabled={busy}>{busy ? 'Salvataggio…' : 'Salva'}</button>
          <button className="btn ghost" onClick={() => setEdit(null)}>Annulla</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row">
        <span className="muted small">I clienti prenotano i posti dall’app: la prenotazione è confermata subito finché ci sono posti.</span>
        <span className="spacer" />
        <button className="btn" onClick={() => { setErrore(null); setEdit(nuovo()); }}><Plus size={16} /> Nuovo evento</button>
      </div>
      {caricamento && <Loading />}
      {data?.length === 0 && <div className="empty">Nessun evento.</div>}
      {data?.map((e) => (
        <div key={e.id} className="card pren">
          <GiornoBox ms={e.data} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 8 }}>
              <strong>{e.titolo}</strong>
              {!e.pubblicato && <span className="badge">Nascosto</span>}
              {e.data < Date.now() && <span className="badge">Passato</span>}
            </div>
            <div className="small muted">
              {e.postiPrenotati}/{e.posti} posti · {e.prezzo ? `${euro(e.prezzo)} a persona` : 'ingresso libero'}
            </div>
            <div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${(e.postiPrenotati / e.posti) * 100}%` }} /></div>
          </div>
          <button className="icon-btn" title="Modifica" onClick={() => { setErrore(null); setEdit(e); }}><Pencil size={16} /></button>
          <button
            className="icon-btn"
            title="Elimina"
            onClick={async () => {
              if (confirm(`Eliminare “${e.titolo}”?${e.postiPrenotati ? ' Ci sono già prenotazioni: avvisa i clienti.' : ''}`)) {
                await b.deleteEvento(e.id);
                ricarica();
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
