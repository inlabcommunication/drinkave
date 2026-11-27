const env = import.meta.env;

// Configurazione web di Firebase. Questi valori NON sono segreti: finiscono comunque nell'app
// scaricata da ogni cliente. La protezione dei dati è fatta dalle regole in firestore.rules.
// Si possono sovrascrivere con le variabili VITE_FIREBASE_* (vedi .env.example).
export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined) || 'AIzaSyBkFzSNc9EC2hg_xq2GLkw-Bq6Bq1Lhp-Y',
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || 'drinkave.firebaseapp.com',
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) || 'drinkave',
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || 'drinkave.firebasestorage.app',
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || '988958870080',
  appId: (env.VITE_FIREBASE_APP_ID as string | undefined) || '1:988958870080:web:77ff0229439e3ec9b66da5',
};

export const vapidKey = env.VITE_FIREBASE_VAPID_KEY as string | undefined;

/** Modalità demo (dati nel browser) solo se richiesta esplicitamente con VITE_DEMO=1. */
export const DEMO = env.VITE_DEMO === '1' || !firebaseConfig.apiKey || !firebaseConfig.projectId;
