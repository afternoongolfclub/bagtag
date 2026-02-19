
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCng0U0BlSgvxx7BnslgdFTkoMvF_Sc6dw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "bagtag-9bd42.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? "https://bagtag-9bd42-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "bagtag-9bd42",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "bagtag-9bd42.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "795159376530",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:795159376530:web:dca64b99cb2b255348ec4b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-529DEZ0R8Q",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
