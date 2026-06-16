import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signOut, onAuthStateChanged, type User } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  type QueryConstraint,
} from "firebase/firestore";

// Preencha com as credenciais do seu projeto Firebase Console
// (Project Settings → Your apps → Firebase SDK snippet → Config)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string,
};

export const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

const app  = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db   = app ? getFirestore(app) : null;

// Firebase Functions Gen2 usam Cloud Run URLs.
// Se a variável VITE_FUNCTIONS_HASH estiver definida, usa o formato Gen2.
// Caso contrário, usa o formato legado (us-central1-PROJECT.cloudfunctions.net).
const functionsHash = import.meta.env.VITE_FUNCTIONS_HASH as string | undefined;

function buildFunctionUrl(name: string): string {
  if (functionsHash) {
    // Formato Gen2: https://functionname-HASH-uc.a.run.app
    return `https://${name.toLowerCase()}-${functionsHash}-uc.a.run.app`;
  }
  const base = (import.meta.env.VITE_FUNCTIONS_BASE_URL as string)
    ?? `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net`;
  return `${base}/${name}`;
}

// Chamada genérica para uma Firebase Function
export async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const url = buildFunctionUrl(name);
  const res  = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? "Erro na função.");
  }
  return res.json() as Promise<T>;
}

export {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, increment,
  signInWithCustomToken, signOut, onAuthStateChanged,
  type User, type QueryConstraint,
};
