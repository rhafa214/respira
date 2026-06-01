import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, DocumentData, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

export function useCollection<T>(collectionName: string) {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
        setError("O servidor demorou muito para responder. Verifique sua conexão à internet ou se algum bloqueador de anúncios (AdBlock, Brave) está impedindo o acesso ao Firebase.");
      }
    }, 10000);

    const q = query(
      collection(db, collectionName),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isMounted) return;
      const results: T[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      setData(results);
      setLoading(false);
      setError(null);
    }, (err) => {
      if (!isMounted) return;
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, collectionName);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [collectionName, user]);

  const add = async (item: Omit<T, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return null;
    try {
      const now = new Date().toISOString();
      let payload: any = {
        ...item,
        userId: user.uid,
      };
      
      if (collectionName === 'debts' || collectionName === 'goals') {
         payload.createdAt = now;
         payload.updatedAt = now;
      } else if (collectionName === 'transactions') {
         payload.createdAt = now;
      }

      const docRef = await addDoc(collection(db, collectionName), payload);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
    }
  };

  const update = async (id: string, updates: Partial<T>) => {
    try {
      const docRef = doc(db, collectionName, id);
      const payload: any = { ...updates };
      if (collectionName === 'debts' || collectionName === 'goals') {
        payload.updatedAt = new Date().toISOString();
      }
      await updateDoc(docRef, payload);
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  return { data, loading, error, add, update, remove };
}
