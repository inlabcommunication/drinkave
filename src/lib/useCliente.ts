import { useEffect, useState } from 'react';
import { backend } from './backend';
import type { Profilo } from './types';

/** Cliente loggato: undefined = sto controllando, null = non loggato. */
export function useCliente(): Profilo | null | undefined {
  const [p, setP] = useState<Profilo | null | undefined>(undefined);
  useEffect(() => {
    let stop = () => {};
    let vivo = true;
    backend().then((b) => {
      if (vivo) stop = b.onCliente(setP);
    });
    return () => {
      vivo = false;
      stop();
    };
  }, []);
  return p;
}

/** Legge il parametro ?torna= dall'indirizzo (#/area?torna=/bottiglie/abc). */
export function tornaA(): string | null {
  const q = window.location.hash.split('?')[1];
  const t = q ? new URLSearchParams(q).get('torna') : null;
  return t && t.startsWith('/') && !t.startsWith('//') ? t : null;
}
