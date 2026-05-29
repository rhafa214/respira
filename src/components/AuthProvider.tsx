import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { doc, getDocFromServer, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Automatically create user profile if it doesn't exist
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const userDoc = await getDocFromServer(userDocRef).catch(err => {
            if (err.code !== 'permission-denied') {
              handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
            }
            return null;
          });
          
          if (!userDoc || !userDoc.exists()) {
            await setDoc(userDocRef, {
              userId: u.uid,
              name: u.displayName || 'Família',
              email: u.email,
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
            console.error('Error auto-provisioning user:', e);
        }
      }
      setUser(u);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const email = "familia@copiloto.app";
    const password = "familia-copiloto-2026";
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch(createErr) {
          console.error("Failed to create shared account:", createErr);
        }
      } else {
        console.error("Login failed:", e);
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

