import { Wine } from 'lucide-react';
import { useId } from 'react';

const colori: [RegExp, string, string][] = [
  [/bollicin|spumant|champagne|franciacorta|prosecco/i, '#e2c46a', '#b8912f'],
  [/bianc/i, '#e8d27a', '#c2a13d'],
  [/ros[ée]|rosato/i, '#e58a8a', '#b8585c'],
  [/rum|whisk|cognac|brandy|distill|liquor|amaro|bourbon/i, '#c47a2c', '#8a4a14'],
  [/gin|vodka|mezcal|tequila/i, '#cfe3e0', '#97b9b4'],
];

export function coloreLiquido(categoria: string, nome = ''): [string, string] {
  const t = `${categoria} ${nome}`;
  for (const [re, a, b] of colori) if (re.test(t)) return [a, b];
  return ['#9c1a1e', '#5e0b0e']; // rosso
}

/** Bottiglia disegnata che si riempie man mano che i calici vengono presi. */
export function BottleViz({
  parti,
  prese,
  categoria,
  nome,
  size = 120,
}: {
  parti: number;
  prese: number;
  categoria: string;
  nome?: string;
  size?: number;
}) {
  const id = useId().replace(/:/g, '');
  const frac = parti > 0 ? Math.min(1, prese / parti) : 0;
  const [chiaro, scuro] = coloreLiquido(categoria, nome);
  const sagoma =
    'M50 6 h20 a4 4 0 0 1 4 4 v62 c0 14 26 26 26 52 v158 a14 14 0 0 1 -14 14 h-52 a14 14 0 0 1 -14 -14 v-158 c0 -26 26 -38 26 -52 v-62 a4 4 0 0 1 4 -4 z';
  return (
    <svg
      className="bottle-viz"
      viewBox="0 0 120 304"
      width={size * 0.4}
      height={size}
      role="img"
      aria-label={`${prese} su ${parti} calici presi`}
    >
      <defs>
        <clipPath id={`c${id}`}>
          <path d={sagoma} />
        </clipPath>
        <linearGradient id={`l${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={scuro} />
          <stop offset=".45" stopColor={chiaro} />
          <stop offset="1" stopColor={scuro} />
        </linearGradient>
      </defs>
      <path d={sagoma} fill="rgba(255,255,255,.04)" />
      <g clipPath={`url(#c${id})`}>
        {/* livello: il corpo va da y=110 a y=298 */}
        <rect
          className="liquid"
          x="0"
          y="110"
          width="120"
          height="188"
          fill={`url(#l${id})`}
          style={{ transform: `scaleY(${frac})` }}
        />
        {Array.from({ length: parti - 1 }, (_, i) => (
          <line key={i} x1="20" x2="34" y1={298 - (188 / parti) * (i + 1)} y2={298 - (188 / parti) * (i + 1)} stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
        ))}
        <rect x="30" y="20" width="6" height="270" rx="3" fill="rgba(255,255,255,.12)" />
      </g>
      <path d={sagoma} fill="none" stroke="var(--gold)" strokeWidth="2.5" />
      <rect x="47" y="2" width="26" height="14" rx="3" fill="var(--wine)" stroke="var(--gold)" strokeWidth="2" />
      <rect x="28" y="170" width="64" height="56" rx="4" fill="rgba(7,10,10,.55)" stroke="var(--gold)" strokeWidth="1.2" />
      <text x="60" y="206" textAnchor="middle" fill="var(--gold-2)" fontFamily="Oswald, sans-serif" fontSize="24" fontWeight="600">
        {prese}/{parti}
      </text>
    </svg>
  );
}

/** Fila di calici: pieni quelli già presi, evidenziati i tuoi. */
export function Calici({ parti, prese, mie = 0 }: { parti: number; prese: number; mie?: number }) {
  return (
    <div className="calici" aria-hidden="true">
      {Array.from({ length: parti }, (_, i) => {
        const cls = i < prese ? (i >= prese - mie ? 'mio' : 'preso') : 'libero';
        return (
          <span key={i} className={`calice ${cls}`}>
            <Wine size={20} strokeWidth={1.8} />
          </span>
        );
      })}
    </div>
  );
}
