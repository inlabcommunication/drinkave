import { useState } from 'react';
import { backend } from '../lib/backend';
import type { Prenotazione } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { Loading } from './Ui';

export const etichettaStato: Record<Prenotazione['stato'], [string, string]> = {
  richiesta: ['In attesa di conferma', 'warn'],
  confermata: ['Confermata', 'on'],
  rifiutata: ['Non disponibile', 'off'],
  annullata: ['Annullata', ''],
};

export function GiornoBox({ ms }: { ms: number }) {
  const d = new Date(ms);
  return (
    <div className="evento-data" aria-hidden="true">
      <span>{d.toLocaleDateString('it-IT', { month: 'short' })}</span>
      <strong>{d.getDate()}</strong>
      <span>{d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
}

/** Prenotazioni del cliente (area personale): prossime in evidenza, con annullamento. */
export function MiePrenotazioni({ uid }: { uid: string }) {
  const { data, caricamento, ricarica } = useAsync(async () => (await backend()).miePrenotazioni(), [uid]);
  const [busy, setBusy] = useState<string | null>(null);
  const limite = Date.now() - 6 * 3600_000;
  const prossime = (data ?? []).filter((p) => p.data >= limite).sort((a, b) => a.data - b.data);

  if (caricamento) return <Loading />;
  if (!prossime.length) {
    return (
      <div className="card center stack">
        <p className="muted" style={{ margin: 0 }}>Nessuna prenotazione in programma.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className="btn ghost sm" href="#/prenota">Prenota un tavolo</a>
          <a className="btn ghost sm" href="#/prenota/eventi">Vedi gli eventi</a>
        </div>
      </div>
    );
  }
  return (
    <div className="stack">
      {prossime.map((p) => {
        const [label, cls] = etichettaStato[p.stato];
        const annullabile = (p.stato === 'richiesta' || p.stato === 'confermata') && p.data > Date.now();
        return (
          <div key={p.id} className="card pren">
            <GiornoBox ms={p.data} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '1.2rem' }}>{p.tipo === 'evento' ? p.eventoTitolo : 'Tavolo'}</h3>
              <div className="muted small">
                {p.persone} {p.persone === 1 ? 'persona' : 'persone'}
                {p.note ? ` · ${p.note}` : ''}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <span className={`badge ${cls}`}>{label}</span>
                {annullabile && (
                  <button
                    className="btn ghost sm"
                    disabled={busy === p.id}
                    onClick={async () => {
                      if (!confirm('Vuoi annullare questa prenotazione?')) return;
                      setBusy(p.id);
                      try {
                        await (await backend()).annullaPrenotazione(p);
                      } finally {
                        setBusy(null);
                        ricarica();
                      }
                    }}
                  >
                    Annulla
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
