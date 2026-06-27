import { createContext, useContext, useState, useEffect } from 'react'
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
  const [currentUser, setCurrentUser] = useState(null) // firebase auth user
  const [userData, setUserData] = useState(null)        // firestore user doc
  const [loading, setLoading] = useState(true)

  // Listen to auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          setUserData({ id: user.uid, ...userDoc.data() })
        } else {
          setUserData(null)
        }
      } else {
        setUserData(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // Sign in — checks that the user's role matches the portal they're on
  async function login(email, password, expectedRole) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid))

    if (!userDoc.exists()) {
      await signOut(auth)
      throw new Error('Account not found. Contact your placement cell.')
    }

    const data = userDoc.data()

    // Role check: admin portal only for admin, etc.
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

    // Check approval
    if (!data.approved) {
      await signOut(auth)
      throw new Error('Your account is pending approval. Contact your HOD or placement admin.')
    }

    setUserData({ id: cred.user.uid, ...data })
    return data
  }

  // Register a new student (default role)
  async function registerStudent(email, password, profile) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const userProfile = {
      email,
      role: 'student',
      displayName: profile.displayName || '',
      department: profile.department || '',
      phone: profile.phone || '',
      approved: false, // needs HOD approval
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), userProfile)

    // Create student academic record
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

    // Sign out immediately — account needs approval first
    await signOut(auth)
    return userProfile
  }

  // Register company (by admin, or self-registration)
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
