# Drinkave — web app dello speakeasy

App per i clienti (installabile sul telefono) + area di gestione.

**Per i clienti**
- **Menu** con categorie, prezzi, ingredienti ed etichette.
- **La mia area**: ogni cliente ha un profilo (nome, cognome, telefono, email facoltativa, password) e accede con **telefono + password**. Nell’area trova la **parola d’ordine**, **le sue bottiglie** e le notifiche.
- **Bottiglia condivisa**: bottiglie divise in calici (es. 6). Il cliente sceglie quanti calici prendere; la bottiglia si riempie man mano e, quando tutti i calici sono presi, compare “Adesso sei pronto ad assaggiarla?”. Il pagamento si fa al locale.
- **News**: articoli, eventi, novità (con immagine facoltativa).
- **Podcast**: episodi da YouTube che si guardano **dentro l’app** (player incorporato, niente salto su YouTube). I video del canale [@Drinkavebereculturale](https://www.youtube.com/@Drinkavebereculturale) compaiono **in automatico** (vedi sotto).
- **Notifiche push** (Android/desktop subito; su iPhone dopo “Aggiungi alla schermata Home”, iOS 16.4+).

**Gestione** (`/#/gestione`, accesso con email e password)
- Panoramica con numeri principali.
- **Bottiglie**: crea bottiglie (nome, tipo, prezzo, numero di calici), vedi chi ha preso quanti calici con telefono e importo, segna come “servita”, avvia un nuovo giro.
- Modifica **menu**, **parola segreta** (con avviso push opzionale), **news**, **podcast** (basta incollare il link YouTube).
- **Clienti**: elenco con ricerca, filtro consenso marketing, eliminazione e **download Excel (.xlsx)**.
- **Invio notifiche** a tutti i dispositivi iscritti.

## Provarla subito (modalità demo)

Senza configurazione Firebase l’app parte in **modalità demo**: tutto funziona, ma i dati restano nel browser. In gestione si entra con qualsiasi email/password.

```bash
npm install
npm run dev
```

## Mettere online (Firebase + Vercel)

1. **Firebase** (console.firebase.google.com) → nuovo progetto, regione UE.
   - *Authentication* → abilita **Email/password** (i clienti accedono con telefono + password: l’app usa un’email tecnica `numero@clienti.drinkave.app`). In *Users* crea l’utente del titolare.
   - *Firestore Database* → crea il database (es. `eur3`). In *Regole* incolla `firestore.rules` e pubblica.
   - In Firestore crea a mano la raccolta **`admins`** con un documento il cui ID è l’**UID** dell’utente del titolare (campo qualsiasi, es. `nome: "Titolare"`). Solo questi utenti entrano in gestione.
   - *Impostazioni progetto → Le tue app* → aggiungi app Web e copia i valori nelle variabili `VITE_FIREBASE_*`.
   - *Cloud Messaging → Certificati push web* → genera la coppia di chiavi e copia la chiave pubblica in `VITE_FIREBASE_VAPID_KEY`.
   - *Account di servizio* → “Genera nuova chiave privata”: il JSON va in `FIREBASE_SERVICE_ACCOUNT` (solo su Vercel, mai nel repository).
2. **Vercel** → nuovo progetto da questo repository (framework Vite, impostazioni predefinite), aggiungi le variabili di `.env.example`, deploy.
3. Dalla gestione: imposta la parola, il menu e il primo episodio.

## Dati (Firestore)

| Raccolta | Contenuto | Chi legge |
|---|---|---|
| `contenuti/menu` | menu completo | tutti |
| `news`, `podcast` | articoli ed episodi | tutti (solo pubblicati) |
| `segreto/parola` | parola d’ordine | solo iscritti e admin |
| `clienti` | anagrafica iscritti | solo admin |
| `telefoni`, `accessi` | indici per riconoscere gli iscritti | nessuno (solo regole) |
| `pushTokens` | dispositivi con notifiche attive | solo server |
| `admins` | chi può gestire | ognuno solo il proprio |

## Note

- La parola è “segreta” rispetto a chi non si iscrive: chiunque lasci nome e telefono la vede (è lo scopo). I dati dei clienti invece non sono mai leggibili dal pubblico.
- L’informativa privacy in `src/pages/Privacy.tsx` è un modello: va completata con i dati del titolare e verificata.
- Il telefono non viene verificato via SMS: si può aggiungere in seguito (Firebase Phone Auth, a pagamento oltre la soglia gratuita).

## Podcast: video del canale YouTube in automatico

La pagina Podcast mostra gli episodi inseriti dal pannello **più** tutti i video del canale YouTube, letti dalla funzione `api/youtube.ts` (risposta in cache per 10 minuti). Se lo stesso video è anche nel pannello, vale la versione del pannello (titolo e descrizione personalizzati); se nel pannello è in **bozza**, il video non compare nell’app (serve `FIREBASE_SERVICE_ACCOUNT`, già usata per le notifiche).

Variabili d’ambiente su Vercel (tutte facoltative):

| Variabile | A cosa serve |
|---|---|
| `YOUTUBE_API_KEY` | Chiave *YouTube Data API v3* (Google Cloud). Con la chiave compaiono **tutti** i video del canale; senza, solo gli **ultimi 15** (feed RSS pubblico). |
| `YOUTUBE_CHANNEL_ID` | ID del canale (`UC…`). Se manca viene ricavato dall’handle. |
| `YOUTUBE_HANDLE` | Handle del canale, predefinito `@Drinkavebereculturale`. |
