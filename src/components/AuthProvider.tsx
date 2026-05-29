import { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const FAKE_UID = "familia-compartilhada-2026";

interface AuthContextType {
  user: any | null;
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
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent shared family login
    const saved = localStorage.getItem("family_login");
    if (saved) {
      setUser({ uid: FAKE_UID, email: "familia@copiloto.app", displayName: "Família" });
    }
    setLoading(false);
  }, []);

  const autoProvisionUser = async () => {
    try {
      const userDocRef = doc(db, 'users', FAKE_UID);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          userId: FAKE_UID,
          name: 'Família',
          email: "familia@copiloto.app",
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('Error auto-provisioning user:', e);
    }
  };

  const signIn = async () => {
    localStorage.setItem("family_login", "true");
    setUser({ uid: FAKE_UID, email: "familia@copiloto.app", displayName: "Família" });
    await autoProvisionUser();
  };

  const signOut = async () => {
    localStorage.removeItem("family_login");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

