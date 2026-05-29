import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, DocumentData, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';

export function useCollection<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, collectionName),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: T[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      setData(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const add = async (item: Omit<T, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!auth.currentUser) return null;
    try {
      const now = new Date().toISOString();
      let payload: any = {
        ...item,
        userId: auth.currentUser.uid,
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

  return { data, loading, add, update, remove };
}
