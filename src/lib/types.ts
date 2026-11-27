export interface MenuItem {
  id: string;
  nome: string;
  descrizione: string;
  prezzo: string;
  tag?: string;
}

export interface MenuCategory {
  id: string;
  nome: string;
  nota?: string;
  voci: MenuItem[];
}

export interface Menu {
  categorie: MenuCategory[];
  aggiornato?: number;
}

export interface NewsItem {
  id: string;
  titolo: string;
  sommario: string;
  testo: string;
  immagine?: string;
  categoria?: string;
  data: number;
  pubblicata: boolean;
}

export interface PodcastEpisode {
  id: string;
  titolo: string;
  descrizione: string;
  youtubeUrl: string;
  data: number;
  pubblicato: boolean;
}

export interface Parola {
  parola: string;
  nota?: string;
  aggiornata: number;
}

export interface Cliente {
  id: string;
  nome: string;
  cognome: string;
  telefono: string;
  email?: string;
  consensoMarketing: boolean;
  creato: number;
}

export interface Registrazione {
  nome: string;
  cognome: string;
  telefono: string;
  email?: string;
  password: string;
  consensoMarketing: boolean;
}

/** Profilo del cliente loggato. */
export interface Profilo {
  uid: string;
  nome: string;
  cognome: string;
  telefono: string;
  email?: string;
  consensoMarketing: boolean;
  creato: number;
}

export type StatoBottiglia = 'aperta' | 'completa' | 'servita';

/** "Bottiglia condivisa": si apre solo quando tutte le parti (calici) sono state prese. */
export interface Bottiglia {
  id: string;
  nome: string;
  categoria: string;
  descrizione: string;
  immagine?: string;
  /** prezzo dell'intera bottiglia in euro */
  prezzo: number;
  /** in quante parti (calici) è divisa */
  parti: number;
  partiPrese: number;
  stato: StatoBottiglia;
  pubblicata: boolean;
  creata: number;
}

/** Una parte di bottiglia acquistata da un cliente. */
export interface Quota {
  id: string;
  bottigliaId: string;
  bottigliaNome: string;
  uid: string;
  nome: string;
  telefono: string;
  parti: number;
  importo: number;
  quando: number;
}

export type PushResult = 'attivate' | 'negate' | 'non-supportate' | 'errore' | 'accedi';
