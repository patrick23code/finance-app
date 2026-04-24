import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

export function useCollection(collectionName, uid) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const q = query(
      collection(db, collectionName),
      where('uid', '==', uid)
    )
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setData(docs)
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [collectionName, uid])

  return { data, loading }
}

export async function addDocument(collectionName, uid, payload) {
  return addDoc(collection(db, collectionName), {
    ...payload,
    uid,
    createdAt: serverTimestamp()
  })
}

export async function updateDocument(collectionName, id, payload) {
  return updateDoc(doc(db, collectionName, id), payload)
}

export async function deleteDocument(collectionName, id) {
  return deleteDoc(doc(db, collectionName, id))
}
