import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore/lite';
import type { Backend } from './backend';
import { ErroreUtente } from './backend';
import { firebaseConfig, vapidKey } from './config';
import type { Bottiglia, Cliente, Evento, Menu, NewsItem, Parola, PodcastEpisode, Prenotazione, Profilo, Quota } from './types';
import { emailDaTelefono, normalizzaTelefono, uid as nuovoId } from './util';

const ms = (v: unknown): number =>
  v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : Date.now();

export function creaFirebaseBackend(): Backend {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const ascoltatoriCliente = new Set<(p: Profilo | null) => void>();
  let profiloCorrente: Profilo | null | undefined;

  async function caricaProfilo(u: User | null): Promise<Profilo | null> {
    if (!u || u.isAnonymous || !u.email?.endsWith('@clienti.drinkave.app')) return null;
    try {
      const s = await getDoc(doc(db, 'clienti', u.uid));
      if (!s.exists()) return null;
      const x = s.data();
      return {
        uid: u.uid,
        nome: x.nome,
        cognome: x.cognome,
        telefono: x.telefono,
        email: x.email || undefined,
        consensoMarketing: !!x.consensoMarketing,
        creato: ms(x.creato),
      };
    } catch {
      return null;
    }
  }

  async function aggiornaProfilo() {
    await auth.authStateReady();
    profiloCorrente = await caricaProfilo(auth.currentUser);
    ascoltatoriCliente.forEach((cb) => cb(profiloCorrente ?? null));
    return profiloCorrente;
  }

  onAuthStateChanged(auth, () => void aggiornaProfilo());

  async function cliente(): Promise<Profilo> {
    const p = profiloCorrente === undefined ? await aggiornaProfilo() : profiloCorrente;
    if (!p) throw new ErroreUtente('Accedi alla tua area per continuare.');
    return p;
  }

  async function utenteAdmin(): Promise<User> {
    await auth.authStateReady();
    const u = auth.currentUser;
    if (!u || u.isAnonymous) throw new ErroreUtente('Accedi come amministratore.');
    return u;
  }

  async function leggiParola(): Promise<Parola> {
    const s = await getDoc(doc(db, 'segreto', 'parola'));
    if (!s.exists()) return { parola: '—', nota: 'La parola non è ancora stata impostata.', aggiornata: Date.now() };
    const d = s.data();
    return { parola: d.parola, nota: d.nota, aggiornata: ms(d.aggiornata) };
  }

  return {
    demo: false,

    async getMenu() {
      const s = await getDoc(doc(db, 'contenuti', 'menu'));
      return s.exists() ? (s.data() as Menu) : { categorie: [] };
    },
    async listNews(tutte = false) {
      const q = tutte ? collection(db, 'news') : query(collection(db, 'news'), where('pubblicata', '==', true));
      const s = await getDocs(q);
      return s.docs.map((d) => ({ ...(d.data() as NewsItem), id: d.id })).sort((a, b) => b.data - a.data);
    },
    async listPodcast(tutti = false) {
      const q = tutti ? collection(db, 'podcast') : query(collection(db, 'podcast'), where('pubblicato', '==', true));
      const s = await getDocs(q);
      return s.docs.map((d) => ({ ...(d.data() as PodcastEpisode), id: d.id })).sort((a, b) => b.data - a.data);
    },

    async registra(r) {
      const telefono = normalizzaTelefono(r.telefono);
      let user: User;
      try {
        user = (await createUserWithEmailAndPassword(auth, emailDaTelefono(telefono), r.password)).user;
      } catch (e) {
        const code = (e as { code?: string }).code ?? '';
        if (code.includes('email-already-in-use')) throw new ErroreUtente('Questo numero è già registrato: usa “Accedi”.');
        if (code.includes('weak-password')) throw new ErroreUtente('La password deve avere almeno 6 caratteri.');
        if (code.includes('operation-not-allowed') || code.includes('admin-restricted')) {
          throw new ErroreUtente('Registrazioni non attive: abilita “Email/password” in Firebase Authentication.');
        }
        throw e;
      }
      try {
        await setDoc(doc(db, 'clienti', user.uid), {
          nome: r.nome.trim(),
          cognome: r.cognome.trim(),
          telefono,
          email: r.email?.trim() || '',
          consensoMarketing: r.consensoMarketing,
          creato: serverTimestamp(),
        });
      } catch (e) {
        // Profilo non salvato: si annulla l'account, così il numero resta libero per riprovare.
        await deleteUser(user).catch(() => undefined);
        throw e;
      }
      await aggiornaProfilo();
    },
    async login(telefono, password) {
      try {
        await signInWithEmailAndPassword(auth, emailDaTelefono(telefono), password);
      } catch (e) {
        const code = (e as { code?: string }).code ?? '';
        if (code.includes('too-many-requests')) throw new ErroreUtente('Troppi tentativi. Riprova tra qualche minuto.');
        throw new ErroreUtente('Telefono o password non corretti.');
      }
      if (!(await aggiornaProfilo())) {
        await signOut(auth);
        throw new ErroreUtente('Profilo cliente non trovato.');
      }
    },
    async logout() {
      await signOut(auth);
      await aggiornaProfilo();
    },
    onCliente(cb) {
      ascoltatoriCliente.add(cb);
      if (profiloCorrente !== undefined) cb(profiloCorrente);
      else void aggiornaProfilo();
      return () => ascoltatoriCliente.delete(cb);
    },
    async getParola() {
      await cliente();
      return leggiParola();
    },

    async listBottiglie(tutte = false) {
      const q = tutte ? collection(db, 'bottiglie') : query(collection(db, 'bottiglie'), where('pubblicata', '==', true));
      const s = await getDocs(q);
      return s.docs.map((d) => ({ ...(d.data() as Bottiglia), id: d.id })).sort((a, b) => b.creata - a.creata);
    },
    async acquistaParti(bottigliaId, parti) {
      const p = await cliente();
      const ref = doc(db, 'bottiglie', bottigliaId);
      const quotaId = nuovoId();
      try {
        return await runTransaction(db, async (tx) => {
          const s = await tx.get(ref);
          if (!s.exists()) throw new ErroreUtente('Bottiglia non trovata.');
          const b = { ...(s.data() as Bottiglia), id: s.id };
          const rimaste = b.parti - b.partiPrese;
          if (b.stato !== 'aperta' || rimaste <= 0) throw new ErroreUtente('Questa bottiglia è già completa.');
          if (parti < 1 || parti > rimaste) throw new ErroreUtente(`Sono rimasti solo ${rimaste} calici.`);
          const partiPrese = b.partiPrese + parti;
          const stato = partiPrese === b.parti ? 'completa' : 'aperta';
          tx.set(doc(db, 'quote', quotaId), {
            bottigliaId,
            bottigliaNome: b.nome,
            uid: p.uid,
            nome: `${p.nome} ${p.cognome}`.trim(),
            telefono: p.telefono,
            parti,
            importo: Math.round((b.prezzo / b.parti) * parti * 100) / 100,
            quando: serverTimestamp(),
          });
          tx.update(ref, { partiPrese, stato, ultimaQuota: quotaId });
          return { ...b, partiPrese, stato } as Bottiglia;
        });
      } catch (e) {
        if (e instanceof ErroreUtente) throw e;
        console.error(e);
        throw new ErroreUtente('Acquisto non riuscito: qualcuno potrebbe aver preso gli ultimi calici. Riprova.');
      }
    },
    async mieQuote() {
      const p = await cliente();
      const s = await getDocs(query(collection(db, 'quote'), where('uid', '==', p.uid)));
      return s.docs.map((d) => ({ ...(d.data() as Quota), id: d.id, quando: ms(d.data().quando) })).sort((a, b) => b.quando - a.quando);
    },

    async listEventi(tutti = false) {
      const q = tutti ? collection(db, 'eventi') : query(collection(db, 'eventi'), where('pubblicato', '==', true));
      const s = await getDocs(q);
      const ora = Date.now() - 6 * 3600_000;
      return s.docs
        .map((d) => ({ ...(d.data() as Evento), id: d.id }))
        .filter((e) => tutti || e.data >= ora)
        .sort((a, b) => a.data - b.data);
    },
    async prenotaTavolo(r) {
      const p = await cliente();
      await setDoc(doc(db, 'prenotazioni', nuovoId()), {
        tipo: 'tavolo',
        uid: p.uid,
        nome: `${p.nome} ${p.cognome}`.trim(),
        telefono: p.telefono,
        data: Math.round(r.data),
        persone: r.persone,
        note: r.note.trim().slice(0, 300),
        eventoId: '',
        eventoTitolo: '',
        stato: 'richiesta',
        creata: serverTimestamp(),
      });
    },
    async prenotaEvento(eventoId, persone, note) {
      const p = await cliente();
      const ref = doc(db, 'eventi', eventoId);
      const pid = nuovoId();
      try {
        await runTransaction(db, async (tx) => {
          const s = await tx.get(ref);
          if (!s.exists()) throw new ErroreUtente('Evento non trovato.');
          const e = s.data() as Evento;
          const liberi = e.posti - e.postiPrenotati;
          if (liberi <= 0) throw new ErroreUtente('Posti esauriti.');
          if (persone < 1 || persone > liberi) throw new ErroreUtente(`Sono rimasti solo ${liberi} posti.`);
          tx.set(doc(db, 'prenotazioni', pid), {
            tipo: 'evento',
            uid: p.uid,
            nome: `${p.nome} ${p.cognome}`.trim(),
            telefono: p.telefono,
            data: e.data,
            persone,
            note: note.trim().slice(0, 300),
            eventoId,
            eventoTitolo: e.titolo,
            stato: 'confermata',
            creata: serverTimestamp(),
          });
          tx.update(ref, { postiPrenotati: e.postiPrenotati + persone, ultimaPrenotazione: pid });
        });
      } catch (e) {
        if (e instanceof ErroreUtente) throw e;
        console.error(e);
        throw new ErroreUtente('Prenotazione non riuscita: qualcuno potrebbe aver preso gli ultimi posti. Riprova.');
      }
    },
    async miePrenotazioni() {
      const p = await cliente();
      const s = await getDocs(query(collection(db, 'prenotazioni'), where('uid', '==', p.uid)));
      return s.docs.map((d) => ({ ...(d.data() as Prenotazione), id: d.id, creata: ms(d.data().creata) })).sort((a, b) => b.data - a.data);
    },
    async annullaPrenotazione(pr) {
      await cliente();
      const pref = doc(db, 'prenotazioni', pr.id);
      if (pr.tipo === 'tavolo') {
        await updateDoc(pref, { stato: 'annullata' });
        return;
      }
      const eref = doc(db, 'eventi', pr.eventoId);
      await runTransaction(db, async (tx) => {
        const s = await tx.get(eref);
        const pp = await tx.get(pref);
        if (!pp.exists() || pp.data().stato !== 'confermata') throw new ErroreUtente('Prenotazione già annullata.');
        tx.update(pref, { stato: 'annullata' });
        if (s.exists()) {
          const e = s.data() as Evento;
          tx.update(eref, { postiPrenotati: Math.max(0, e.postiPrenotati - pr.persone), ultimaPrenotazione: pr.id });
        }
      });
    },

    async attivaNotifiche() {
      const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
      await auth.authStateReady();
      if (!auth.currentUser) return 'accedi';
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) {
        return 'non-supportate';
      }
      const permesso = await Notification.requestPermission();
      if (permesso !== 'granted') return 'negate';
      try {
        const reg = (await navigator.serviceWorker.getRegistration('/')) ?? (await navigator.serviceWorker.register('/sw.js'));
        await navigator.serviceWorker.ready;
        const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
        if (!token) return 'errore';
        await setDoc(doc(db, 'pushTokens', token), { token, creato: serverTimestamp() });
        return 'attivate';
      } catch (e) {
        console.error(e);
        return 'errore';
      }
    },

    async adminLogin(email, password) {
      try {
        const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
        const a = await getDoc(doc(db, 'admins', user.uid));
        if (!a.exists()) {
          await signOut(auth);
          throw new ErroreUtente('Questo account non è abilitato alla gestione.');
        }
      } catch (e) {
        if (e instanceof ErroreUtente) throw e;
        throw new ErroreUtente('Email o password non corrette.');
      }
    },
    async adminLogout() {
      await signOut(auth);
    },
    onAdmin(cb) {
      return onAuthStateChanged(auth, async (u) => {
        if (!u || u.isAnonymous) return cb(null);
        try {
          const a = await getDoc(doc(db, 'admins', u.uid));
          cb(a.exists() ? { email: u.email ?? '' } : null);
        } catch {
          cb(null);
        }
      });
    },
    async saveMenu(m) {
      await utenteAdmin();
      await setDoc(doc(db, 'contenuti', 'menu'), { ...m, aggiornato: Date.now() });
    },
    async saveNews(n) {
      await utenteAdmin();
      const { id, ...dati } = n;
      await setDoc(doc(db, 'news', id), { ...dati, immagine: dati.immagine ?? '', categoria: dati.categoria ?? '' });
    },
    async deleteNews(id) {
      await utenteAdmin();
      await deleteDoc(doc(db, 'news', id));
    },
    async savePodcast(p) {
      await utenteAdmin();
      const { id, ...dati } = p;
      await setDoc(doc(db, 'podcast', id), dati);
    },
    async deletePodcast(id) {
      await utenteAdmin();
      await deleteDoc(doc(db, 'podcast', id));
    },
    async getParolaAdmin() {
      await utenteAdmin();
      const s = await getDoc(doc(db, 'segreto', 'parola'));
      if (!s.exists()) return null;
      const d = s.data();
      return { parola: d.parola, nota: d.nota, aggiornata: ms(d.aggiornata) };
    },
    async saveParola(p) {
      await utenteAdmin();
      await setDoc(doc(db, 'segreto', 'parola'), { parola: p.parola, nota: p.nota ?? '', aggiornata: Date.now() });
    },
    async listClienti() {
      await utenteAdmin();
      const s = await getDocs(collection(db, 'clienti'));
      return s.docs
        .map((d) => {
          const x = d.data();
          return {
            id: d.id,
            nome: x.nome,
            cognome: x.cognome,
            telefono: x.telefono,
            email: x.email || undefined,
            consensoMarketing: !!x.consensoMarketing,
            creato: ms(x.creato),
          } satisfies Cliente;
        })
        .sort((a, b) => b.creato - a.creato);
    },
    async deleteCliente(c) {
      await utenteAdmin();
      await deleteDoc(doc(db, 'clienti', c.id));
    },
    async saveBottiglia(b) {
      await utenteAdmin();
      const { id, ...dati } = b;
      const ref = doc(db, 'bottiglie', id);
      const esiste = (await getDoc(ref)).exists();
      const base = {
        nome: dati.nome,
        categoria: dati.categoria,
        descrizione: dati.descrizione,
        immagine: dati.immagine ?? '',
        prezzo: dati.prezzo,
        parti: dati.parti,
        pubblicata: dati.pubblicata,
      };
      if (esiste) await updateDoc(ref, base);
      else await setDoc(ref, { ...base, partiPrese: 0, stato: 'aperta', creata: Date.now(), ultimaQuota: '' });
    },
    async deleteBottiglia(id) {
      await utenteAdmin();
      await deleteDoc(doc(db, 'bottiglie', id));
    },
    async setStatoBottiglia(id, stato) {
      await utenteAdmin();
      await updateDoc(doc(db, 'bottiglie', id), { stato });
    },
    async listQuote(bottigliaId) {
      await utenteAdmin();
      const s = await getDocs(query(collection(db, 'quote'), where('bottigliaId', '==', bottigliaId)));
      return s.docs.map((d) => ({ ...(d.data() as Quota), id: d.id, quando: ms(d.data().quando) })).sort((a, b) => a.quando - b.quando);
    },
    async saveEvento(e) {
      await utenteAdmin();
      const { id, ...dati } = e;
      const ref = doc(db, 'eventi', id);
      const base = {
        titolo: dati.titolo,
        descrizione: dati.descrizione,
        immagine: dati.immagine ?? '',
        data: Math.round(dati.data),
        posti: dati.posti,
        prezzo: dati.prezzo,
        pubblicato: dati.pubblicato,
      };
      if ((await getDoc(ref)).exists()) await updateDoc(ref, base);
      else await setDoc(ref, { ...base, postiPrenotati: 0, ultimaPrenotazione: '' });
    },
    async deleteEvento(id) {
      await utenteAdmin();
      await deleteDoc(doc(db, 'eventi', id));
    },
    async listPrenotazioni(daData) {
      await utenteAdmin();
      const s = await getDocs(query(collection(db, 'prenotazioni'), where('data', '>=', Math.round(daData)), orderBy('data')));
      return s.docs.map((d) => ({ ...(d.data() as Prenotazione), id: d.id, creata: ms(d.data().creata) }));
    },
    async setStatoPrenotazione(pr, stato) {
      await utenteAdmin();
      const pref = doc(db, 'prenotazioni', pr.id);
      const liberaPosti = pr.tipo === 'evento' && pr.stato === 'confermata' && (stato === 'annullata' || stato === 'rifiutata');
      if (!liberaPosti) {
        await updateDoc(pref, { stato });
        return;
      }
      const eref = doc(db, 'eventi', pr.eventoId);
      await runTransaction(db, async (tx) => {
        const s = await tx.get(eref);
        tx.update(pref, { stato });
        if (s.exists()) {
          const e = s.data() as Evento;
          tx.update(eref, { postiPrenotati: Math.max(0, e.postiPrenotati - pr.persone) });
        }
      });
    },
    async inviaNotifica(titolo, testo, link) {
      const u = await utenteAdmin();
      const r = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await u.getIdToken()}` },
        body: JSON.stringify({ titolo, testo, link }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new ErroreUtente(j.errore || 'Invio non riuscito.');
      return { inviate: j.inviate ?? 0, errori: j.errori ?? 0 };
    },
  };
}
