import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  registerNewUser: (name: string, email: string, pass: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            setProfile({
              uid: currentUser.uid,
              name: data.username || currentUser.displayName || currentUser.email || 'User',
              email: currentUser.email || undefined,
              role: (data.role as UserRole) || 'staff',
            });
          } else {
            // Default profile if doc doesn't exist
            setProfile({
              uid: currentUser.uid,
              name: currentUser.displayName || currentUser.email || 'User',
              email: currentUser.email || undefined,
              role: 'staff',
            });
          }
        } catch (error) {
          console.error('Failed to fetch user role:', error);
          setProfile({
            uid: currentUser.uid,
            name: currentUser.email || 'User',
            role: 'staff',
          });
        }
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const registerNewUser = async (name: string, email: string, pass: string, role: UserRole) => {
    // Use secondary app to prevent logging out current admin
    const secondaryApp = getApps().find(a => a.name === 'SecondaryReg') || 
      initializeApp(firebaseConfig, 'SecondaryReg');
    const secAuth = getAuth(secondaryApp);
    const secDb = getFirestore(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(secAuth, email, pass);
      await setDoc(doc(secDb, 'users', cred.user.uid), {
        username: name,
        email: email,
        role: role,
        createdAt: serverTimestamp(),
      });
      await signOut(secAuth);
    } catch (err) {
      await signOut(secAuth).catch(() => {});
      throw err;
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isLoading,
        login,
        logout,
        registerNewUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
