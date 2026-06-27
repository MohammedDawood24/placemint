import { createContext, useContext, useState, useEffect, useRef } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Ref to track if login() is handling the auth flow
  // so onAuthStateChanged doesn't interfere
  const loginInProgress = useRef(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)

      // If login() is actively running, let it handle userData
      if (loginInProgress.current) {
        return
      }

      // This handles page refresh (user already signed in)
      if (user) {
        setLoading(true)
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            if (data.approved) {
              setUserData({ id: user.uid, ...data })
            } else {
              // Not approved — sign them out
              await signOut(auth)
              setUserData(null)
            }
          } else {
            setUserData(null)
          }
        } catch {
          setUserData(null)
        }
      } else {
        setUserData(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function login(email, password, expectedRole) {
    // Tell onAuthStateChanged to back off
    loginInProgress.current = true

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid))

      if (!userDoc.exists()) {
        await signOut(auth)
        throw new Error('Account not found. Contact your placement cell.')
      }

      const data = userDoc.data()

      // Role check
      const roleMatch = {
        admin: ['admin'],
        hod: ['hod', 'coordinator'],
        company: ['company'],
        student: ['student'],
      }

      if (expectedRole && roleMatch[expectedRole]) {
        if (!roleMatch[expectedRole].includes(data.role)) {
          await signOut(auth)
          throw new Error(
            `This is the ${expectedRole} portal. Your account role is "${data.role}". Please use the correct portal.`
          )
        }
      }

      // Approval check
      if (!data.approved) {
        await signOut(auth)
        throw new Error('Your account is pending approval. Contact your HOD or placement admin.')
      }

      // Everything valid — set user data
      setCurrentUser(cred.user)
      setUserData({ id: cred.user.uid, ...data })
      setLoading(false)
      return data
    } finally {
      loginInProgress.current = false
    }
  }

  async function registerStudent(email, password, profile) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const userProfile = {
      email,
      role: 'student',
      displayName: profile.displayName || '',
      department: profile.department || '',
      phone: profile.phone || '',
      approved: false,
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), userProfile)

    await setDoc(doc(db, 'students', cred.user.uid), {
      usn: profile.usn || '',
      department: profile.department || '',
      semester: profile.semester || 1,
      tenthMarks: null,
      twelfthMarks: null,
      cgpa: null,
      semesters: {},
      profileComplete: false,
      placementStatus: 'eligible',
      placedAt: null,
      package: null,
      updatedAt: serverTimestamp(),
    })

    await signOut(auth)
    return userProfile
  }

  async function registerCompany(email, password, profile) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const userProfile = {
      email,
      role: 'company',
      displayName: profile.companyName || '',
      approved: false,
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), userProfile)

    await setDoc(doc(db, 'companies', cred.user.uid), {
      name: profile.companyName || '',
      industry: profile.industry || '',
      website: profile.website || '',
      logo: profile.logo || '#4C5BD4',
      hrContact: email,
      about: profile.about || '',
      userId: cred.user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await signOut(auth)
    return userProfile
  }

  async function logout() {
    await signOut(auth)
    setCurrentUser(null)
    setUserData(null)
  }

  const value = {
    currentUser,
    userData,
    loading,
    login,
    logout,
    registerStudent,
    registerCompany,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
