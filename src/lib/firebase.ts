import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  collection, 
  doc, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  increment, 
  arrayUnion, 
  writeBatch 
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyC5sGKGeD_zht-Qknp6VPwfPIChqwvX8MQ",
  authDomain: "masstore-c32a7.firebaseapp.com",
  projectId: "masstore-c32a7",
  storageBucket: "masstore-c32a7.firebasestorage.app",
  messagingSenderId: "321720130071",
  appId: "1:321720130071:web:20aab19001cc8bb3cd9a52"
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support offline persistence.');
    }
  });
}

// Collections
export const productsCol = collection(db, 'products');
export const repairsCol = collection(db, 'repairs');
export const transactionsCol = collection(db, 'transactions');
export const debtsCol = collection(db, 'debts');
export const usersCol = collection(db, 'users');
export const activityLogsCol = collection(db, 'activity_logs');

// Helper to log user activity
export async function logActivity(user: string, action: string, details: string) {
  try {
    await addDoc(activityLogsCol, {
      user,
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch {
    // Non-critical, ignore
  }
}

export {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  writeBatch
};
