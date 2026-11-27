import type { Backend } from './backend';
import { ErroreUtente } from './backend';
import { bottiglieIniziali, eventiIniziali, menuIniziale, newsIniziali, parolaIniziale, podcastIniziali } from './demoData';
import type { Bottiglia, Cliente, Evento, Menu, NewsItem, Parola, PodcastEpisode, Prenotazione, Profilo, Quota } from './types';
import { normalizzaTelefono, uid } from './util';

const K = 'drinkave.demo.';

function leggi<T>(chiave: string, iniziale: T): T {
  try {
    const raw = localStorage.getItem(K + chiave);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* storage non disponibile */
  }
  return iniziale;
}

function scrivi(chiave: string, valore: unknown) {
  try {
    localStorage.setItem(K + chiave, JSON.stringify(valore));
  } catch {
    /* storage non disponibile */
  }
}

const attesa = () => new Promise((r) => setTimeout(r, 150));

export function creaDemoBackend(): Backend {
  const ascoltatori = new Set<(a: { email: string } | null) => void>();
  const adminCorrente = () => leggi<{ email: string } | null>('admin', null);
  const notifica = () => ascoltatori.forEach((cb) => cb(adminCorrente()));
  const ascoltatoriCliente = new Set<(p: Profilo | null) => void>();
  const profilo = (): Profilo | null => {
    const id = leggi<string | null>('sessione', null);
    const c = id ? leggi<Cliente[]>('clienti', []).find((x) => x.id === id) : undefined;
    return c ? { uid: c.id, nome: c.nome, cognome: c.cognome, telefono: c.telefono, email: c.email, consensoMarketing: c.consensoMarketing, creato: c.creato } : null;
  };
  const notificaCliente = () => ascoltatoriCliente.forEach((cb) => cb(profilo()));
  const cambiaStato = (pr: Prenotazione, stato: Prenotazione['stato']) => {
    const lista = leggi<Prenotazione[]>('prenotazioni', []);
    const x = lista.find((y) => y.id === pr.id);
    if (!x) return;
    if (x.tipo === 'evento' && x.stato === 'confermata' && (stato === 'annullata' || stato === 'rifiutata')) {
      const ev = leggi<Evento[]>('eventi', eventiIniziali);
      const e = ev.find((y) => y.id === x.eventoId);
      if (e) e.postiPrenotati = Math.max(0, e.postiPrenotati - x.persone);
      scrivi('eventi', ev);
    }
    x.stato = stato;
    scrivi('prenotazioni', lista);
  };
  const richiediAdmin = () => {
    if (!adminCorrente()) throw new ErroreUtente('Accesso non autorizzato.');
  };

  return {
    demo: true,

    async getMenu() {
      await attesa();
      return leggi<Menu>('menu', menuIniziale);
    },
    async listNews(tutte = false) {
      await attesa();
      const n = leggi<NewsItem[]>('news', newsIniziali);
      return n.filter((x) => tutte || x.pubblicata).sort((a, b) => b.data - a.data);
    },
    async listPodcast(tutti = false) {
      await attesa();
      const p = leggi<PodcastEpisode[]>('podcast', podcastIniziali);
      return p.filter((x) => tutti || x.pubblicato).sort((a, b) => b.data - a.data);
    },

    async registra(r) {
      await attesa();
      const telefono = normalizzaTelefono(r.telefono);
      const clienti = leggi<(Cliente & { password: string })[]>('clienti', []);
      if (clienti.some((c) => c.telefono === telefono)) throw new ErroreUtente('Questo numero è già registrato: usa “Accedi”.');
      if (r.password.length < 6) throw new ErroreUtente('La password deve avere almeno 6 caratteri.');
      const c = {
        id: uid(),
        nome: r.nome.trim(),
        cognome: r.cognome.trim(),
        telefono,
        email: r.email?.trim() || undefined,
        consensoMarketing: r.consensoMarketing,
        creato: Date.now(),
        password: r.password,
      };
      scrivi('clienti', [...clienti, c]);
      scrivi('sessione', c.id);
      notificaCliente();
    },
    async login(tel, password) {
      await attesa();
      const telefono = normalizzaTelefono(tel);
      const c = leggi<(Cliente & { password: string })[]>('clienti', []).find((x) => x.telefono === telefono);
      if (!c || c.password !== password) throw new ErroreUtente('Telefono o password non corretti.');
      scrivi('sessione', c.id);
      notificaCliente();
    },
    async logout() {
      try {
        localStorage.removeItem(K + 'sessione');
      } catch {
        /* */
      }
      notificaCliente();
    },
    onCliente(cb) {
      ascoltatoriCliente.add(cb);
      cb(profilo());
      return () => ascoltatoriCliente.delete(cb);
    },
    async getParola() {
      await attesa();
      if (!profilo()) throw new ErroreUtente('Accedi alla tua area per continuare.');
      return leggi<Parola>('parola', parolaIniziale);
    },

    async listBottiglie(tutte = false) {
      await attesa();
      return leggi<Bottiglia[]>('bottiglie', bottiglieIniziali)
        .filter((b) => tutte || b.pubblicata)
        .sort((a, b) => b.creata - a.creata);
    },
    async acquistaParti(id, parti) {
      await attesa();
      const p = profilo();
      if (!p) throw new ErroreUtente('Accedi alla tua area per continuare.');
      const lista = leggi<Bottiglia[]>('bottiglie', bottiglieIniziali);
      const b = lista.find((x) => x.id === id);
      if (!b) throw new ErroreUtente('Bottiglia non trovata.');
      const rimaste = b.parti - b.partiPrese;
      if (b.stato !== 'aperta' || rimaste <= 0) throw new ErroreUtente('Questa bottiglia è già completa.');
      if (parti < 1 || parti > rimaste) throw new ErroreUtente(`Sono rimasti solo ${rimaste} calici.`);
      b.partiPrese += parti;
      b.stato = b.partiPrese === b.parti ? 'completa' : 'aperta';
      scrivi('bottiglie', lista);
      const q: Quota = {
        id: uid(),
        bottigliaId: id,
        bottigliaNome: b.nome,
        uid: p.uid,
        nome: `${p.nome} ${p.cognome}`,
        telefono: p.telefono,
        parti,
        importo: Math.round((b.prezzo / b.parti) * parti * 100) / 100,
        quando: Date.now(),
      };
      scrivi('quote', [...leggi<Quota[]>('quote', []), q]);
      return { ...b };
    },
    async mieQuote() {
      await attesa();
      const p = profilo();
      if (!p) return [];
      return leggi<Quota[]>('quote', []).filter((q) => q.uid === p.uid).sort((a, b) => b.quando - a.quando);
    },

    async listEventi(tutti = false) {
      await attesa();
      const ora = Date.now() - 6 * 3600_000;
      return leggi<Evento[]>('eventi', eventiIniziali).filter((e) => tutti || (e.pubblicato && e.data >= ora)).sort((a, b) => a.data - b.data);
    },
    async prenotaTavolo(r) {
      await attesa();
      const p = profilo();
      if (!p) throw new ErroreUtente('Accedi alla tua area per continuare.');
      const pr: Prenotazione = { id: uid(), tipo: 'tavolo', uid: p.uid, nome: `${p.nome} ${p.cognome}`, telefono: p.telefono, data: r.data, persone: r.persone, note: r.note, eventoId: '', eventoTitolo: '', stato: 'richiesta', creata: Date.now() };
      scrivi('prenotazioni', [...leggi<Prenotazione[]>('prenotazioni', []), pr]);
    },
    async prenotaEvento(eventoId, persone, note) {
      await attesa();
      const p = profilo();
      if (!p) throw new ErroreUtente('Accedi alla tua area per continuare.');
      const lista = leggi<Evento[]>('eventi', eventiIniziali);
      const e = lista.find((x) => x.id === eventoId);
      if (!e) throw new ErroreUtente('Evento non trovato.');
      const liberi = e.posti - e.postiPrenotati;
      if (liberi <= 0) throw new ErroreUtente('Posti esauriti.');
      if (persone < 1 || persone > liberi) throw new ErroreUtente(`Sono rimasti solo ${liberi} posti.`);
      e.postiPrenotati += persone;
      scrivi('eventi', lista);
      const pr: Prenotazione = { id: uid(), tipo: 'evento', uid: p.uid, nome: `${p.nome} ${p.cognome}`, telefono: p.telefono, data: e.data, persone, note, eventoId, eventoTitolo: e.titolo, stato: 'confermata', creata: Date.now() };
      scrivi('prenotazioni', [...leggi<Prenotazione[]>('prenotazioni', []), pr]);
    },
    async miePrenotazioni() {
      await attesa();
      const p = profilo();
      return p ? leggi<Prenotazione[]>('prenotazioni', []).filter((x) => x.uid === p.uid).sort((a, b) => b.data - a.data) : [];
    },
    async annullaPrenotazione(pr) {
      await attesa();
      cambiaStato(pr, 'annullata');
    },

    async attivaNotifiche() {
      if (!('Notification' in window)) return 'non-supportate';
      const p = await Notification.requestPermission();
      if (p !== 'granted') return 'negate';
      const reg = await navigator.serviceWorker?.getRegistration();
      const opzioni = { body: 'Notifiche attive (modalità demo).', icon: '/icon-192.png' };
      if (reg) await reg.showNotification('Drinkave', opzioni);
      else new Notification('Drinkave', opzioni);
      return 'attivate';
    },

    async adminLogin(email, password) {
      await attesa();
      if (!email || !password) throw new ErroreUtente('Inserisci email e password.');
      scrivi('admin', { email });
      notifica();
    },
    async adminLogout() {
      try {
        localStorage.removeItem(K + 'admin');
      } catch {
        /* */
      }
      notifica();
    },
    onAdmin(cb) {
      ascoltatori.add(cb);
      cb(adminCorrente());
      return () => ascoltatori.delete(cb);
    },
    async saveMenu(m) {
      richiediAdmin();
      scrivi('menu', { ...m, aggiornato: Date.now() });
    },
    async saveNews(n) {
      richiediAdmin();
      const lista = leggi<NewsItem[]>('news', newsIniziali).filter((x) => x.id !== n.id);
      scrivi('news', [...lista, n]);
    },
    async deleteNews(id) {
      richiediAdmin();
      scrivi('news', leggi<NewsItem[]>('news', newsIniziali).filter((x) => x.id !== id));
    },
    async savePodcast(p) {
      richiediAdmin();
      const lista = leggi<PodcastEpisode[]>('podcast', podcastIniziali).filter((x) => x.id !== p.id);
      scrivi('podcast', [...lista, p]);
    },
    async deletePodcast(id) {
      richiediAdmin();
      scrivi('podcast', leggi<PodcastEpisode[]>('podcast', podcastIniziali).filter((x) => x.id !== id));
    },
    async getParolaAdmin() {
      richiediAdmin();
      return leggi<Parola>('parola', parolaIniziale);
    },
    async saveParola(p) {
      richiediAdmin();
      scrivi('parola', p);
    },
    async listClienti() {
      richiediAdmin();
      return leggi<(Cliente & { password?: string })[]>('clienti', [])
        .map(({ password: _p, ...c }) => c)
        .sort((a, b) => b.creato - a.creato);
    },
    async deleteCliente(c) {
      richiediAdmin();
      scrivi('clienti', leggi<Cliente[]>('clienti', []).filter((x) => x.id !== c.id));
    },
    async saveBottiglia(b) {
      richiediAdmin();
      const lista = leggi<Bottiglia[]>('bottiglie', bottiglieIniziali);
      const i = lista.findIndex((x) => x.id === b.id);
      if (i >= 0) lista[i] = { ...lista[i], ...b, partiPrese: lista[i].partiPrese, stato: lista[i].stato };
      else lista.push({ ...b, partiPrese: 0, stato: 'aperta', creata: Date.now() });
      scrivi('bottiglie', lista);
    },
    async deleteBottiglia(id) {
      richiediAdmin();
      scrivi('bottiglie', leggi<Bottiglia[]>('bottiglie', bottiglieIniziali).filter((x) => x.id !== id));
    },
    async setStatoBottiglia(id, stato) {
      richiediAdmin();
      scrivi('bottiglie', leggi<Bottiglia[]>('bottiglie', bottiglieIniziali).map((x) => (x.id === id ? { ...x, stato } : x)));
    },
    async listQuote(bottigliaId) {
      richiediAdmin();
      return leggi<Quota[]>('quote', []).filter((q) => q.bottigliaId === bottigliaId).sort((a, b) => a.quando - b.quando);
    },
    async saveEvento(e) {
      richiediAdmin();
      const lista = leggi<Evento[]>('eventi', eventiIniziali);
      const i = lista.findIndex((x) => x.id === e.id);
      if (i >= 0) lista[i] = { ...lista[i], ...e, postiPrenotati: lista[i].postiPrenotati };
      else lista.push({ ...e, postiPrenotati: 0 });
      scrivi('eventi', lista);
    },
    async deleteEvento(id) {
      richiediAdmin();
      scrivi('eventi', leggi<Evento[]>('eventi', eventiIniziali).filter((x) => x.id !== id));
    },
    async listPrenotazioni(daData) {
      richiediAdmin();
      return leggi<Prenotazione[]>('prenotazioni', []).filter((x) => x.data >= daData).sort((a, b) => a.data - b.data);
    },
    async setStatoPrenotazione(pr, stato) {
      richiediAdmin();
      cambiaStato(pr, stato);
    },
    async inviaNotifica(titolo, testo) {
      richiediAdmin();
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg && Notification.permission === 'granted') {
        await reg.showNotification(titolo, { body: testo, icon: '/icon-192.png' });
        return { inviate: 1, errori: 0 };
      }
      return { inviate: 0, errori: 0 };
    },
  };
}
