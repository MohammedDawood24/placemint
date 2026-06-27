import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, limit,
  onSnapshot, doc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Real-time listener on a Firestore collection with optional filters.
 *
 * Usage:
 *   const { data, loading } = useCollection('students', [
 *     where('department', '==', 'CSE'),
 *     orderBy('cgpa', 'desc'),
 *     limit(20)
 *   ])
 */
export function useCollection(collectionName, constraints = [], deps = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, collectionName), ...constraints)
    const unsub = onSnapshot(q,
      (snap) => {
        setData(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => { setError(err); setLoading(false) }
    )
    return unsub
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error }
}

/**
 * Real-time listener on a single Firestore document.
 */
export function useDocument(collectionName, docId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!docId) { setLoading(false); return }
    const unsub = onSnapshot(doc(db, collectionName, docId),
      (snap) => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
  }, [collectionName, docId])

  return { data, loading }
}

/**
 * One-shot fetch for a collection count.
 */
export async function getCollectionCount(collectionName, constraints = []) {
  const q = query(collection(db, collectionName), ...constraints)
  const snap = await getCountFromServer(q)
  return snap.data().count
}

/* ------- CRUD helpers ------- */

export async function addDocument(collectionName, data) {
  return addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateDocument(collectionName, docId, data) {
  return updateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDocument(collectionName, docId) {
  return deleteDoc(doc(db, collectionName, docId))
}

export async function getDocument(collectionName, docId) {
  const snap = await getDoc(doc(db, collectionName, docId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function queryDocuments(collectionName, constraints = []) {
  const q = query(collection(db, collectionName), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/* Re-export Firestore operators for convenience */
export { where, orderBy, limit, serverTimestamp }
