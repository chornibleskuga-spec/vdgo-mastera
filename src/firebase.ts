import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCXbWHUcLgTkxXZGOgi0jV0au6CgdX2Yic",
  authDomain: "vdgo-master-sync.firebaseapp.com",
  databaseURL: "https://vdgo-master-sync-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "vdgo-master-sync",
  storageBucket: "vdgo-master-sync.firebasestorage.app",
  messagingSenderId: "696945613117",
  appId: "1:696945613117:web:f6c7a2ad06d6d87a4ecd54",
  measurementId: "G-9P0H5Z43GE"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
