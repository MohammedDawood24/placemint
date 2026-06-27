import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// ============================================================
//  REPLACE these values with YOUR Firebase project config.
//  Find them at: Firebase Console → Project Settings → Your apps
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCNriV3JQ9gmcXo3FMS1LvErKBbM53X3mg",
  authDomain: "placement-f2b19.firebaseapp.com",
  projectId: "placement-f2b19",
  storageBucket: "placement-f2b19.firebasestorage.app",
  messagingSenderId: "27854311111",
  appId: "1:27854311111:web:a4e6293733fd187971b8e2"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
