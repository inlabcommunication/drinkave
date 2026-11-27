import type { Bottiglia, Evento, Menu, NewsItem, Parola, PodcastEpisode } from './types';

const giorno = 86_400_000;
const ora = Date.now();

export const menuIniziale: Menu = {
  categorie: [
    {
      id: 'signature',
      nome: 'Signature',
      nota: 'Le creazioni della casa',
      voci: [
        { id: 's1', nome: 'Parola d’Ordine', descrizione: 'Bourbon, vermouth rosso, amaro alle erbe, bitter al cacao', prezzo: '12', tag: 'Forte' },
        { id: 's2', nome: 'Porta Chiusa', descrizione: 'Gin, liquore ai fiori di sambuco, limone, albume, lavanda', prezzo: '11' },
        { id: 's3', nome: 'Luna di Contrabbando', descrizione: 'Rum scuro, caffè, vaniglia bourbon, scorza d’arancia', prezzo: '12' },
      ],
    },
    {
      id: 'classici',
      nome: 'Classici',
      voci: [
        { id: 'c1', nome: 'Negroni', descrizione: 'Gin, bitter, vermouth rosso', prezzo: '10' },
        { id: 'c2', nome: 'Old Fashioned', descrizione: 'Rye whiskey, zucchero, Angostura', prezzo: '11' },
        { id: 'c3', nome: 'Martinez', descrizione: 'Old Tom gin, vermouth, maraschino', prezzo: '11' },
      ],
    },
    {
      id: 'analcolici',
      nome: 'Senza alcol',
      voci: [{ id: 'a1', nome: 'Proibito', descrizione: 'Tè nero affumicato, miele, limone, soda allo zenzero', prezzo: '8', tag: 'Analcolico' }],
    },
  ],
  aggiornato: ora,
};

export const newsIniziali: NewsItem[] = [
  {
    id: 'n1',
    titolo: 'Vino & Convivio',
    sommario: 'Degustazione guidata: il convivio inizia dal calice. Ore 20:30.',
    testo: 'Una serata lenta, tra calici e racconti. Degustazione guidata con abbinamenti della casa.\n\nPosti limitati: prenota in DM e ricordati la parola d’ordine.',
    categoria: 'Eventi',
    data: ora - giorno,
    pubblicata: true,
  },
  {
    id: 'n2',
    titolo: 'Vinili & Convivio',
    sommario: 'Si suona su vinile, si beve con calma. Sapora il tempo.',
    testo: 'Castagne, fichi, spezie e agrumi invernali: la nuova lista è arrivata. Chiedi al bartender il percorso degustazione.',
    categoria: 'Novità',
    data: ora - 6 * giorno,
    pubblicata: true,
  },
];

export const podcastIniziali: PodcastEpisode[] = [
  {
    id: 'p1',
    titolo: 'Episodio di esempio',
    descrizione: 'Sostituisci questo episodio dal pannello di gestione incollando il link YouTube del podcast.',
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    data: ora - 3 * giorno,
    pubblicato: true,
  },
];

export const parolaIniziale: Parola = { parola: 'Gatsby', nota: 'Valida fino a domenica', aggiornata: ora };

export const bottiglieIniziali: Bottiglia[] = [
  {
    id: 'b1',
    nome: 'Primitivo di Manduria Riserva',
    categoria: 'Vino rosso',
    descrizione: 'Rosso pugliese pieno e caldo, note di prugna, spezie e cacao.',
    prezzo: 60,
    parti: 6,
    partiPrese: 4,
    stato: 'aperta',
    pubblicata: true,
    creata: ora - giorno,
  },
  {
    id: 'b2',
    nome: 'Rum Agricole 12 anni',
    categoria: 'Distillato',
    descrizione: 'Rum da canna fresca invecchiato in botti di rovere: vaniglia, tabacco, frutta secca.',
    prezzo: 90,
    parti: 6,
    partiPrese: 1,
    stato: 'aperta',
    pubblicata: true,
    creata: ora - 2 * giorno,
  },
  {
    id: 'b3',
    nome: 'Franciacorta Brut',
    categoria: 'Bollicine',
    descrizione: 'Metodo classico, perlage fine, crosta di pane e agrumi.',
    prezzo: 48,
    parti: 6,
    partiPrese: 0,
    stato: 'aperta',
    pubblicata: true,
    creata: ora - 3 * giorno,
  },
];

const sera = (giorni: number, ore = 21) => {
  const d = new Date(ora + giorni * giorno);
  d.setHours(ore, 0, 0, 0);
  return d.getTime();
};

export const eventiIniziali: Evento[] = [
  {
    id: 'e1',
    titolo: 'Vino & Convivio',
    descrizione: 'Degustazione guidata di quattro vini pugliesi con abbinamenti della casa. Il convivio inizia dal calice.',
    data: sera(3, 20),
    posti: 20,
    postiPrenotati: 14,
    prezzo: 35,
    pubblicato: true,
  },
  {
    id: 'e2',
    titolo: 'Vinili & Convivio',
    descrizione: 'Si suona su vinile, si beve con calma. Selezione jazz e soul.',
    data: sera(8, 21),
    posti: 30,
    postiPrenotati: 6,
    prezzo: 0,
    pubblicato: true,
  },
];
