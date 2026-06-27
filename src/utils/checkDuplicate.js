import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Checks if an email or phone already exists in the users collection.
 * Returns an error message string, or null if no duplicates found.
 *
 * @param {string} email
 * @param {string} phone — can be empty (skips phone check)
 * @param {string|null} excludeId — user ID to exclude (for edit mode)
 */
export async function checkDuplicateUser(email, phone, excludeId = null) {
  // Check email
  if (email) {
    const emailSnap = await getDocs(
      query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()))
    )
    const emailMatch = emailSnap.docs.find(d => d.id !== excludeId)
    if (emailMatch) {
      return 'This email is already registered. Please use a different email.'
    }
  }

  // Check phone (only if provided and non-empty)
  const cleaned = (phone || '').replace(/[\s\-()]/g, '')
  if (cleaned.length >= 10) {
    const phoneSnap = await getDocs(
      query(collection(db, 'users'), where('phone', '==', phone.trim()))
    )
    const phoneMatch = phoneSnap.docs.find(d => d.id !== excludeId)
    if (phoneMatch) {
      return 'This phone number is already registered. Please use a different number.'
    }
  }

  return null
}
