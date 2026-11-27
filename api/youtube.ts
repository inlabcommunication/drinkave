// Elenco dei video del canale YouTube, per l'area Podcast (Vercel Serverless Function).
// - Con YOUTUBE_API_KEY (YouTube Data API v3) restituisce TUTTI i video del canale.
// - Senza chiave usa il feed RSS pubblico di YouTube, che contiene solo gli ultimi 15 video.
// Canale: YOUTUBE_CHANNEL_ID (UC…) se impostato, altrimenti ricavato dall'handle qui sotto.
import type { IncomingMessage, ServerResponse } from 'node:http';

type Res = ServerResponse & { status: (c: number) => Res; json: (b: unknown) => void };

const HANDLE = process.env.YOUTUBE_HANDLE || '@Drinkavebereculturale';
const MAX_VIDEO = 500;

export interface VideoCanale {
  videoId: string;
  titolo: string;
  descrizione: string;
  data: number;
}

let channelIdCache: string | null = process.env.YOUTUBE_CHANNEL_ID || null;

const entita: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodifica = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return entita[e.toLowerCase()] ?? m;
  });

const tag = (xml: string, nome: string) => {
  const m = xml.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`));
  return m ? decodifica(m[1].trim()) : '';
};

async function scarica(url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'Accept-Language': 'it-IT,it;q=0.9' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} su ${url}`);
  return r.text();
}

/** Ricava l'ID del canale (UC…) dalla pagina pubblica dell'handle. */
async function channelIdDaHandle(): Promise<string> {
  if (channelIdCache) return channelIdCache;
  const html = await scarica(`https://www.youtube.com/${encodeURIComponent(HANDLE)}`);
  const m =
    html.match(/"externalId":"(UC[\w-]{22})"/) ||
    html.match(/<meta itemprop="identifier" content="(UC[\w-]{22})"/) ||
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/);
  if (!m) throw new Error('ID canale non trovato');
  channelIdCache = m[1];
  return channelIdCache;
}

/** Feed RSS pubblico: ultimi 15 video, nessuna chiave richiesta. */
async function videoDaRss(): Promise<VideoCanale[]> {
  const xml = await scarica(`https://www.youtube.com/feeds/videos.xml?channel_id=${await channelIdDaHandle()}`);
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, e]) => ({
      videoId: tag(e, 'yt:videoId'),
      titolo: tag(e, 'title'),
      descrizione: tag(e, 'media:description'),
      data: Date.parse(tag(e, 'published')) || 0,
    }))
    .filter((v) => /^[\w-]{11}$/.test(v.videoId));
}

/** YouTube Data API v3: tutti i video caricati sul canale. */
async function videoDaApi(key: string): Promise<VideoCanale[]> {
  const api = async (path: string, params: Record<string, string>) => {
    const qs = new URLSearchParams({ ...params, key });
    return JSON.parse(await scarica(`https://www.googleapis.com/youtube/v3/${path}?${qs}`));
  };
  const filtro: Record<string, string> = channelIdCache ? { id: channelIdCache } : { forHandle: HANDLE };
  const ch = await api('channels', { part: 'contentDetails', ...filtro });
  const uploads: string | undefined = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error('Playlist dei caricamenti non trovata');

  const out: VideoCanale[] = [];
  let pageToken = '';
  do {
    const p = await api('playlistItems', { part: 'snippet,status', playlistId: uploads, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
    for (const it of p.items ?? []) {
      const s = it.snippet ?? {};
      const videoId: string = s.resourceId?.videoId ?? '';
      if (it.status?.privacyStatus && it.status.privacyStatus !== 'public') continue;
      if (!/^[\w-]{11}$/.test(videoId)) continue;
      out.push({ videoId, titolo: s.title ?? '', descrizione: s.description ?? '', data: Date.parse(s.publishedAt) || 0 });
    }
    pageToken = p.nextPageToken ?? '';
  } while (pageToken && out.length < MAX_VIDEO);
  return out;
}

export default async function handler(req: IncomingMessage, res: Res) {
  if (req.method !== 'GET') return res.status(405).json({ errore: 'Metodo non consentito' });
  try {
    const key = process.env.YOUTUBE_API_KEY;
    const video = (key ? await videoDaApi(key) : await videoDaRss()).sort((a, b) => b.data - a.data);
    // Cache sulla CDN di Vercel: 1 ora, poi aggiorna in background.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ video });
  } catch {
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(502).json({ errore: 'Impossibile leggere il canale YouTube.' });
  }
}
